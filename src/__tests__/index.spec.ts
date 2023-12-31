// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Add any needed widget imports here (or from controls)
// import {} from '@jupyter-widgets/base';

import { createTestModel } from './utils';

import { AudioRecorderModel } from '..';

describe('@naoh16/AudioRecorder', () => {
  describe('AudioRecorderModel', () => {
    it('should be createable', () => {
      const model = createTestModel(AudioRecorderModel);
      expect(model).toBeInstanceOf(AudioRecorderModel);
      expect(model.get('value')).toEqual('Audio Recorder');
    });

    it('should be createable with a value', () => {
      const state = { value: 'Foo Bar!' };
      const model = createTestModel(AudioRecorderModel, state);
      expect(model).toBeInstanceOf(AudioRecorderModel);
      expect(model.get('value')).toEqual('Foo Bar!');
    });
  });
});
