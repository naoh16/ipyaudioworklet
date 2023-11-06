class DataViewEx extends DataView {
  setFourCC(offset:number, cc:string) {
      for(let i=0; i<4; i++) this.setUint8(offset+i, cc.charCodeAt(i));
  }
}

function encodeAudioAsWavfile (audiodata:any[], settings:MediaTrackSettings) {
  console.assert(settings.sampleSize == 16, "sampleSize (Bit-per-sample) should be 16.", settings);
  //console.assert(settings.channelCount == 1, "#Channel should be one (monoral).", settings);
  if(settings.channelCount != 1) {
      console.log("Warning: #Channel is not 1 (monoral).\n"
                + "The sound is forcely converted to monaural sound by \"(L+R)/2\" method.", settings);
  }

  // see WAVEFORMAT_EX
  // https://learn.microsoft.com/ja-jp/windows/win32/api/mmeapi/ns-mmeapi-waveformatex
  const _nSamplesPerSec = settings.sampleRate || 48000;     // ex. 48000 [Hz]
  const _nChannels      = 1; // settings.channelCount;   // ex. 1 [ch]
  const _wBitsPerSample = settings.sampleSize || 16;     // ex. 16 [bit]
  const _nBlockAlign    = _nChannels * _wBitsPerSample / 8; // ex. 2 [byte]
  const _nAvgBytesPerSec = _nBlockAlign * _nSamplesPerSec; // ex. 96000 [byte/sec]

  const dataLengthSample = buffers.reduce((a, v) => a + v.length, 0);
  const dataLengthByte = dataLengthSample * _nBlockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataLengthByte);
  const dv = new DataViewEx(arrayBuffer);
  let offset = 0;

  // RIFF Header
  dv.setFourCC(offset, "RIFF"); offset+=4;
  dv.setUint32(offset, dataLengthByte + 36, true); offset+=4;// filesize - 8
  dv.setFourCC(offset, "WAVE"); offset+=4

  // format chunk
  dv.setFourCC(offset, "fmt "); offset+=4;
  dv.setUint32(offset, 16, true); offset+=4;               // size = 16
  dv.setUint16(offset, 1, true); offset+=2;                // WORD  wFormatTag
  dv.setUint16(offset, _nChannels, true); offset+=2;       // WORD  nChannels
  dv.setUint32(offset, _nSamplesPerSec, true); offset+=4;  // DWORD nSamplesPerSec
  dv.setUint32(offset, _nAvgBytesPerSec, true); offset+=4; // DWORD nAvgBytesPerSec
  dv.setUint16(offset, _nBlockAlign, true); offset+=2;     // WORD  nBlockAlign
  dv.setUint16(offset, _wBitsPerSample, true); offset+=2;  // WORD  wBitsPerSample
  // PCM-format neglect 'cbSize' 

  // data chunk
  dv.setFourCC(offset, "data"); offset+=4;
  dv.setUint32(offset, dataLengthByte, true); offset+=4;

  for (const v of audiodata) {
    dv.setInt16(offset, Math.round(v * 32767), true); offset+=2;
  }

  console.log('Info: sampling_rate = ' + _nSamplesPerSec
              + ' length = ' + dataLengthSample + ', [sample]');

  return new Blob([dv], {type: 'audio/wav'})
}


//const AudioContext = window.AudioContext || window.webkitAudioContext;
if (navigator.mediaDevices) {
  console.log("Info: getUserMedia is supported.");
} else {
  console.log("Error: getUserMedia is not supported.");
}


let audioContext:AudioContext;
let audioRecorderNode:any; //AudioWorkletNode;
let audioSource:MediaStreamAudioSourceNode;
let mediaConfig:MediaTrackSettings;

async function prepareCustomAudioProcessor(module_url:string, module_name:string) {
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
      await audioContext.suspend(); // or resume() ?

      await audioContext.audioWorklet.addModule(module_url);
      audioRecorderNode = new AudioWorkletNode(audioContext, module_name);
      console.log(audioContext)
    } catch (e) {
      console.log(e)
      return null;
    }
  }
  return audioRecorderNode;
}

async function readyAudioSource(constraints:any = undefined) {
  if (!audioSource) {
    try {
      if(!constraints) {
        constraints = {
          video: false,
          audio: {
            channelCount: 1, /** channelCount will be ignored... */
            autoGainControl: false, echoCancellation: false, noiseSuppression: false,
          }
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      audioSource = await audioContext.createMediaStreamSource(stream);
      mediaConfig = await stream.getAudioTracks()[0].getSettings();
      console.log(stream);
      console.log(mediaConfig);
    } catch (e) {
      console.log(e)
      return null;
    }
  }
  return audioSource;
}

let buffers:any[] = []
export let audiodata:any[] = []; //new Float32Array(_audiodata);
export let blob_url:string = "";

export async function run(annealing_time_ms=500) {
  console.log('(1)');
  await prepareCustomAudioProcessor(
    "/lab/extensions/ipyaudioworklet/static/audio-processor.js",
    "audio-reorder-processor");
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

export function getSampleRate(): number|undefined {
  return mediaConfig.sampleRate;
}

export function resume() {
  buffers = [];
  audioRecorderNode.port.onmessage = (e:any) => { buffers.push(e.data); };
  audioContext.resume();
  audioRecorderNode.parameters.get('isRecording').setValueAtTime(1, audioContext.currentTime)
  console.log("recording");
}

export function suspend() {
  audioContext.suspend();
  audioRecorderNode.parameters.get('isRecording').setValueAtTime(0, audioContext.currentTime)
  console.log("suspended");
  // return buffers;

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
}
