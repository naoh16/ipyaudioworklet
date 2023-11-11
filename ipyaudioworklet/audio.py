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
    audiodata = Array([], dtype='float32').tag(sync=True)
    blob_url = Unicode('').tag(sync=True)
    filename = Unicode('default.wav').tag(sync=True)

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
