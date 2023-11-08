class AudioRecorderProcessor extends AudioWorkletProcessor {
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
        // We will receive the params with two cases:
        //   a) isRecording[0]
        //   b) isRecording[0], isRecording[1], ..., isRecording[127]
        // The value at 0 is probably sufficient for most use cases:
        //   128 sample at 44,100 Hz means about 2.9 ms segment.
        const firstInput = inputs[0];
        const firstOutput = outputs[0];
        const f2s_gain = 1. / firstInput.length;
        for(let n=0; n<firstInput.length; n++) {
          for(let m=0; m<firstInput[0].length; m++) {
            firstOutput[0][m] += firstInput[n][m] * f2s_gain;
          }
        }
        this.port.postMessage(firstOutput[0]); // send only 1 channel.
      }

      return true;
    }
  }
  
  registerProcessor("audio-reorder-processor", AudioRecorderProcessor);
