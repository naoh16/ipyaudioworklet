class DataViewEx {
  private view: DataView;
  constructor(
    buffer: ArrayBufferLike,
    byteOffset?: number,
    byteLength?: number
  ) {
    this.view = new DataView(buffer, byteOffset, byteLength);
  }
  setFourCC(offset: number, cc: string) {
    for (let i = 0; i < 4; i++) {
      this.setUint8(offset + i, cc.charCodeAt(i));
    }
  }
  setUint8(byteOffset: number, value: number): void {
    this.view.setUint8(byteOffset, value);
  }
  setUint16(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.view.setUint16(byteOffset, value, littleEndian);
  }
  setUint32(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.view.setUint32(byteOffset, value, littleEndian);
  }
  setInt16(byteOffset: number, value: number, littleEndian?: boolean): void {
    this.view.setInt16(byteOffset, value, littleEndian);
  }
  get dataView(): DataView {
    return this.view;
  }
}

function encodeAudioAsWavfile(audiodata: any[], settings: MediaTrackSettings) {
  // console.assert(settings.sampleSize == 16, "sampleSize (Bit-per-sample) should be 16.", settings);
  if (settings.sampleSize !== 16) {
    console.log(
      'Warning: SampleSize is not 16 [bit].\n',
      'The sound is forcely quantized as int16 (signed short) sound.',
      settings
    );
  }
  //console.assert(settings.channelCount == 1, "#Channel should be one (monoral).", settings);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: TS2339
  if (settings.channelCount !== 1) {
    console.log(
      'Warning: #Channel is not 1 (monoral).\n',
      'The sound is forcely converted to monaural sound by "(L+R)/2" method.',
      settings
    );
  }

  // see WAVEFORMAT_EX
  // https://learn.microsoft.com/ja-jp/windows/win32/api/mmeapi/ns-mmeapi-waveformatex
  const _nSamplesPerSec = settings.sampleRate || 48000; // ex. 48000 [Hz]
  const _nChannels = 1; // settings.channelCount;   // ex. 1 [ch]
  const _wBitsPerSample = 16; // settings.sampleSize || 16;     // ex. 16 [bit]
  const _nBlockAlign = (_nChannels * _wBitsPerSample) / 8; // ex. 2 [byte]
  const _nAvgBytesPerSec = _nBlockAlign * _nSamplesPerSec; // ex. 96000 [byte/sec]

  const dataLengthSample = buffers.reduce((a, v) => a + v.length, 0);
  const dataLengthByte = dataLengthSample * _nBlockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataLengthByte);
  const dv = new DataViewEx(arrayBuffer);
  let offset = 0;

  // RIFF Header
  dv.setFourCC(offset, 'RIFF');
  offset += 4;
  dv.setUint32(offset, dataLengthByte + 36, true);
  offset += 4; // filesize - 8
  dv.setFourCC(offset, 'WAVE');
  offset += 4;

  // format chunk
  dv.setFourCC(offset, 'fmt ');
  offset += 4;
  dv.setUint32(offset, 16, true);
  offset += 4; // size = 16
  dv.setUint16(offset, 1, true);
  offset += 2; // WORD  wFormatTag
  dv.setUint16(offset, _nChannels, true);
  offset += 2; // WORD  nChannels
  dv.setUint32(offset, _nSamplesPerSec, true);
  offset += 4; // DWORD nSamplesPerSec
  dv.setUint32(offset, _nAvgBytesPerSec, true);
  offset += 4; // DWORD nAvgBytesPerSec
  dv.setUint16(offset, _nBlockAlign, true);
  offset += 2; // WORD  nBlockAlign
  dv.setUint16(offset, _wBitsPerSample, true);
  offset += 2; // WORD  wBitsPerSample
  // PCM-format neglect 'cbSize'

  // data chunk
  dv.setFourCC(offset, 'data');
  offset += 4;
  dv.setUint32(offset, dataLengthByte, true);
  offset += 4;

  for (const v of audiodata) {
    dv.setInt16(offset, Math.round(v * 32767), true);
    offset += 2;
  }

  console.log(
    'Info: sampling_rate = ' +
      _nSamplesPerSec +
      ' length = ' +
      dataLengthSample +
      ', [sample]'
  );

  return new Blob([dv.dataView], { type: 'audio/wav' });
}

const procdef_str = `class AudioRecorderProcessor extends AudioWorkletProcessor
{
  constructor() {
    super();
  }

  static get parameterDescriptors() {
    return [
      { name: "isRecording", defaultValue: 0 }
    ];
  }

  process(inputs, outputs, params) {
    if(!inputs[0][0]) return true;

    if(params.isRecording[0] > 0) {
      const firstInput = inputs[0];
      const firstOutput = outputs[0];
      const f2s_gain = 1. / firstInput.length;
      for(let n=0; n<firstInput.length; n++) {
        for(let m=0; m<firstInput[0].length; m++) {
          firstOutput[0][m] += firstInput[n][m] * f2s_gain;
        }
      }
      this.port.postMessage(firstOutput[0]);
    }

    return true;
  }
}
registerProcessor("audio-recorder-processor", AudioRecorderProcessor);`;

//const AudioContext = window.AudioContext || window.webkitAudioContext;
if (navigator.mediaDevices) {
  console.log('Info: getUserMedia is supported.');
} else {
  console.log('Error: getUserMedia is not supported.');
}

let audioContext: AudioContext;
let audioRecorderNode: any; //AudioWorkletNode;
let audioSource: MediaStreamAudioSourceNode;
let mediaConfig: MediaTrackSettings;

async function prepareCustomAudioProcessor(
  module_url: string,
  module_name: string
) {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
      await audioContext.suspend(); // or resume() ?

      await audioContext.audioWorklet.addModule(module_url);
      audioRecorderNode = new AudioWorkletNode(audioContext, module_name);
      console.log(audioContext);
    } catch (e) {
      console.log(e);
      return null;
    }
  }
  return audioRecorderNode;
}

async function readyAudioSource(constraints: any = undefined) {
  if (!audioSource) {
    try {
      if (!constraints) {
        constraints = {
          video: false,
          audio: {
            channelCount: { ideal: 1 } /** channelCount will be ignored... */,
            sampleRate: { ideal: audioContext.sampleRate },
            sampleSize: { ideal: 16 },
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
          },
        };
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      audioSource = await audioContext.createMediaStreamSource(stream);
      mediaConfig = await stream.getAudioTracks()[0].getSettings();
      // Fix sampleRate
      mediaConfig.sampleRate =
        mediaConfig.sampleRate || audioContext.sampleRate;
      console.log(stream);
      console.log(mediaConfig);
    } catch (e) {
      console.log(e);
      return null;
    }
  }
  return audioSource;
}

let buffers: any[] = [];
export let audiodata: any[]; //new Float32Array(_audiodata);
export let blob_url = '';

export async function run(annealing_time_ms = 500): Promise<void> {
  console.log('(1)');
  const blob = new Blob([procdef_str], { type: 'application/javascript' });
  await prepareCustomAudioProcessor(
    URL.createObjectURL(blob),
    'audio-recorder-processor'
  );
  console.log(audioRecorderNode);

  console.log('(2)');
  await readyAudioSource();

  console.log('(3)');
  await audioSource.connect(audioRecorderNode);

  console.log('(4)');
  await audioContext.resume();
  await setTimeout(() => {
    audioContext.suspend();
  }, annealing_time_ms);
  // In general, most of the recording device could not record just after the device booted up.
  // Short wait will be make better result for the first take of recording.

  return;
}

export function getSampleRate(): number | undefined {
  return mediaConfig.sampleRate || audioContext.sampleRate;
}

type AudioChunkCallback = (pos: number, data: number[]) => void;

function sliceAsAudioChunk(
  cb_func: AudioChunkCallback | undefined,
  pos: number,
  q_blocks: any[]
) {
  const dataLengthSample = q_blocks.reduce((a, v) => a + v.length, 0);
  const tmp_audiodata = new Array(dataLengthSample);
  let offset = 0;
  for (const buffer of q_blocks) {
    for (const value of buffer) {
      tmp_audiodata[offset++] = value;
    }
  }
  if (cb_func) {
    cb_func(pos, tmp_audiodata);
  }
}

let chunk_top = 0;
const chunk_num = 16; // each buffer has probably have 128 [sample], therefore 16 [block] ~= 2048 [sample]
let g_cb_func: AudioChunkCallback | undefined = undefined;
export async function resume(cb_func?: AudioChunkCallback): Promise<void> {
  console.log('resume(): called.');

  // Inittialize
  buffers = [];
  chunk_top = 0;
  g_cb_func = cb_func;

  // Prepare callback function for audio processing
  audioRecorderNode.port.onmessage = (e: any) => {
    // Process for making audiodata parameter
    // console.log('recording: ' + buffers.length + ': ' + audioContext.currentTime);
    buffers.push(e.data);

    // Process for audiochunk callback function
    //   To prevent neglect call of the callback function,
    //   we need to control the frequency of the callback function.
    if (g_cb_func && buffers.length >= chunk_top + chunk_num) {
      new Promise((resolv: (value: [number, number]) => void) => {
        resolv([chunk_top, chunk_top + chunk_num]);
      }).then((value) => {
        sliceAsAudioChunk(
          g_cb_func,
          value[0],
          buffers.slice(value[0], value[1])
        );
      });
      chunk_top += chunk_num;
    }
  };

  // Start recording
  await audioContext.resume().then(() => {
    audioRecorderNode.parameters
      .get('isRecording')
      .setValueAtTime(1, audioContext.currentTime);
    // console.log('resume(): at ' + audioContext.currentTime);
    // console.log('resume(): finished.');
  });
}

export async function suspend(): Promise<void> {
  // console.log('suspend(): called.');
  await audioContext.suspend().then(() => {
    audioRecorderNode.parameters
      .get('isRecording')
      .setValueAtTime(0, audioContext.currentTime);
    // console.log('suspended: at ' + audioContext.currentTime);

    // Process for audiochunk callback function
    if (g_cb_func && chunk_top < buffers.length) {
      new Promise((resolv: (value: [number, number]) => void) => {
        resolv([chunk_top, buffers.length]);
      }).then((value) => {
        sliceAsAudioChunk(
          g_cb_func,
          value[0],
          buffers.slice(value[0], value[1])
        );
      });
      chunk_top = buffers.length;
    }

    // Process for the final audio data
    const dataLengthSample = buffers.reduce((a, v) => a + v.length, 0);
    audiodata = new Array(dataLengthSample);

    let offset = 0;
    for (const buffer of buffers) {
      for (const value of buffer) {
        audiodata[offset++] = value;
      }
    }

    const blob = encodeAudioAsWavfile(audiodata, mediaConfig);
    console.log(blob);
    blob_url = URL.createObjectURL(blob);
    //       var reader = new FileReader();
    //       reader.readAsDataURL(blob);
    //       reader.onloadend = function() {
    //         var base64data = reader.result;
    //         const uiLog = document.querySelector('div#log');
    //         uiLog.innerHTML += '<div style="width:100%; overflow-wrap: anywhere;"><code>' + base64data + '</code></div>';
    //       }
    console.log('suspend(): finished.');
  });
}
