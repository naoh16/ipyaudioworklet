#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Sunao Hara.
# Distributed under the terms of the Modified BSD License.

import pytest

from ..audio import AudioRecorder


def test_example_creation_blank():
    w = AudioRecorder()
    assert w.value == 'Audio Recorder'
