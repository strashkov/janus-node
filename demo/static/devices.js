export async function getLocalStream() {
  const localStream = new MediaStream();
  // capture audio and video by different request to avoid 'not found' error
  const vStream = await navigator.mediaDevices.getUserMedia({video: true}).catch(alert);
  const aStream = await navigator.mediaDevices.getUserMedia({audio: true}).catch(alert);

  if (vStream) {
    localStream.addTrack(vStream.getTracks()[0]);
  }
  if (aStream) {
    localStream.addTrack(aStream.getTracks()[0]);
  }
  return localStream;
}