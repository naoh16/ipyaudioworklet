#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Sunao Hara.
# Distributed under the terms of the Modified BSD License.

"""
ipyaudioworklet.AudioRecorder
"""

import sys
import time

from ipywidgets import DOMWidget
from traitlets import Unicode, List, Int
from traittypes import Array
import numpy as np
from ipydatawidgets import NDArray, array_serialization, shape_constraints
from ._frontend import module_name, module_version

class AudioRecorder(DOMWidget):
    _model_name = Unicode('AudioRecorderModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode('AudioRecorderView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = Unicode('Audio Recorder').tag(sync=True)
    sampleRate = Int(-1).tag(sync=True)
    audiodata = NDArray(dtype=np.float32, default_value=np.zeros((0,), dtype=np.float32))\
        .tag(sync=True, **array_serialization)\
        .valid(shape_constraints(None,))
    audiochunk = NDArray(dtype=np.float32, default_value=np.zeros((0,), dtype=np.float32))\
        .tag(sync=True, **array_serialization)\
        .valid(shape_constraints(None,))
    blob_url = Unicode('').tag(sync=True)
    filename = Unicode('default.wav').tag(sync=True)
    status = Unicode('NOT_INITIALIZED').tag(sync=True)

    ####################################################
    # Access TypeScript's functions via custom message
    # see also src/widgets.ts#AudioRecorderView.on_msg()
    ####################################################

    def __init__(self, **kwargs):
        # sys.stderr.write("AudioRecorder: __init__()")
        self.observe(self._on_status_change, names='status')

        super().__init__(**kwargs)

    def run(self):
        # sys.stderr.write("AudioRecorder: run()")
        if self.status != 'NOT_INITIALIZED':
            sys.stderr.write(f"AudioRecorder: {self.status}: run() is ignored")
            return

        self.send({'cmd': 'run', 'args': []})

    def resume(self):
        # sys.stderr.write(f"AudioRecorder: {self.status}: resume()")
        if self.status == 'READY' or self.status == 'RECORDED':
            self.send({'cmd': 'resume', 'args': []})
        else:
            sys.stderr.write(f"AudioRecorder: {self.status}: resume() is ignored")

    def suspend(self):
        # sys.stderr.write(f"AudioRecorder: {self.status}: suspend()")
        if self.status == 'RECORDING':
            self.send({'cmd': 'suspend', 'args': [False]})
            time.sleep(0.1)  # message pump for Typescript
        else:
            sys.stderr.write(f"AudioRecorder: {self.status}: suspend() is ignored")

    def use_audiochunk(self, use_flag=True):
        # print(f"AudioRecorder: use_audiochunk({use_flag})")
        self.send({'cmd': 'use_audiochunk', 'args': [use_flag]})

    def _on_status_change(self, change):
        sys.stderr.write("AudioRecorder: _on_status_change, status = {}\n".format(change['new']))
        match change['new']:
            case 'NOT_INITIALIZED': # It wolud not be called...
                pass
            case 'INITIALIZING':    # run message
                pass
            case 'READY':           # run message
                pass
            case 'RECORDING':       # resume message
                pass
            case 'RECORDED':        # suspend message
                pass
            case _:
                pass
