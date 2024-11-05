#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Sunao Hara.
# Distributed under the terms of the Modified BSD License.

"""
ipyaudioworklet.AudioRecorder
"""

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

    def run(self):
        self.send({'cmd': 'run', 'args': []})

    def resume(self):
        self.send({'cmd': 'resume', 'args': []})

    def suspend(self):
        self.send({'cmd': 'suspend', 'args': []})

    def use_audiochunk(self, use_flag=True):
        self.send({'cmd': 'use_audiochunk', 'args': [use_flag]})
