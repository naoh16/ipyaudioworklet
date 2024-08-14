// Copyright (c) Sunao Hara
// Distributed under the terms of the Modified BSD License.

import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';

import { MODULE_NAME, MODULE_VERSION } from './version';

import * as a from './audio';

let audioProcessorJsUrl =
  'https://cdn.jsdelivr.net/npm/@naoh16/ipyaudioworklet@' +
  MODULE_VERSION +
  '/dist/audio-processor.js';
try {
  if (window.document.body.classList.contains('notebook_app')) {
    // Jupyter Notebook 6.x
    audioProcessorJsUrl =
      '/nbextensions/ipyaudioworklet/static/audio-processor.js';
  } else {
    // Jupyter Lab 3, 4, or Jupyter Notebook 7.x
    const e: any = window.document.querySelector('#jupyter-config-data');
    const jconfig: any = JSON.parse(e.textContent);
    audioProcessorJsUrl =
      jconfig['fullAppUrl'] +
      '/extensions/@naoh16/ipyaudioworklet/static/audio-processor.js';
  }
} catch (error) {
  // nop
}

// Import the CSS
//import '../css/widget.css';

export class AudioRecorderModel extends DOMWidgetModel {
  defaults(): Backbone.ObjectHash {
    return {
      ...super.defaults(),
      _model_name: AudioRecorderModel.model_name,
      _model_module: AudioRecorderModel.model_module,
      _model_module_version: AudioRecorderModel.model_module_version,
      _view_name: AudioRecorderModel.view_name,
      _view_module: AudioRecorderModel.view_module,
      _view_module_version: AudioRecorderModel.view_module_version,

      value: 'Audio Recorder',
      audiodata: [],
      blob_url: '',
      filename: 'default.wav',
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
    // Add any extra serializers here
  };

  static model_name = 'AudioRecorderModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;
  static view_name = 'AudioRecorderView'; // Set to null if no view
  static view_module = MODULE_NAME; // Set to null if no view
  static view_module_version = MODULE_VERSION;
}

export class AudioRecorderView extends DOMWidgetView {
  private _audioControl: HTMLAudioElement;
  private _message: HTMLDivElement;
  private _bootButton: HTMLButtonElement;
  private _resumeButton: HTMLButtonElement;
  private _suspendButton: HTMLButtonElement;
  render(): any {
    this.el.classList.add('jupyter-widgets');

    this._message = document.createElement('div');
    this.el.appendChild(this._message);

    this._bootButton = document.createElement('button');
    this._bootButton.classList.add(
      'jupyter-widgets',
      'jupyter-button',
      'widget-button'
    );
    this._bootButton.textContent = 'Boot RECORDER';
    this._bootButton.title = 'run()';
    this.el.appendChild(this._bootButton);

    this._resumeButton = document.createElement('button');
    this._resumeButton.classList.add(
      'jupyter-widgets',
      'jupyter-button',
      'widget-button'
    );
    this._resumeButton.disabled = true;
    this._resumeButton.textContent = 'Record';
    this._resumeButton.title = 'resume()';
    this.el.appendChild(this._resumeButton);

    this._suspendButton = document.createElement('button');
    this._suspendButton.classList.add(
      'jupyter-widgets',
      'jupyter-button',
      'widget-button'
    );
    this._suspendButton.disabled = true;
    this._suspendButton.textContent = 'Stop';
    this._suspendButton.title = 'suspend()';
    this.el.appendChild(this._suspendButton);

    this._audioControl = document.createElement('audio');
    this._audioControl.controls = true;
    this.el.appendChild(this._audioControl);

    this.value_changed();

    // Python --> JavaScipt update
    this.model.on('change:value', this.value_changed, this);
    this.model.on('msg:custom', this.on_msg, this);

    // JavaScipt --> Python update
    this._bootButton.onclick = this._onClickBootButton.bind(this);
    this._resumeButton.onclick = this._onClickResumeButton.bind(this);
    this._suspendButton.onclick = this._onClickSuspendButton.bind(this);
  }

  private value_changed(): void {
    this._message.textContent = this.model.get('value');
  }

  private on_msg(command: any, buffers: any) {
    switch (command.cmd) {
      case 'run':
        this._onClickBootButton();
        break;
      case 'resume':
        this._onClickResumeButton();
        break;
      case 'suspend':
        this._onClickSuspendButton();
        break;
    }
  }

  private _onClickBootButton() {
    this.model.set('value', 'AudioRecorder is booting...');
    this.model.save_changes();
    a.run(audioProcessorJsUrl).then((r) => {
      const _sampleRate = a.getSampleRate() || -1;
      this.model.set(
        'value',
        'AudioRecorder is ready (Sampling rate: ' +
          String(_sampleRate) +
          ' Hz).'
      );
      this.model.set('sampleRate', _sampleRate);
      this.model.save_changes();

      this._bootButton.disabled = true;
      this._resumeButton.disabled = false;
    });
  }
  private _onClickResumeButton() {
    a.resume();
    this.model.set('value', this._message.textContent + ' [RESUME]');
    this.model.save_changes();

    this._resumeButton.disabled = true;
    this._suspendButton.disabled = false;
  }
  private _onClickSuspendButton() {
    a.suspend();
    //console.log(a.audiodata);
    this.model.set('audiodata', a.audiodata);
    this.model.set('blob_url', a.blob_url);
    this.model.set('value', this._message.textContent + ' [SUSPEND]');
    this.model.save_changes();

    this._audioControl.src = a.blob_url;
    this._audioControl.title = this.model.get('filename');
    this._resumeButton.disabled = false;
    this._suspendButton.disabled = true;
  }
}
