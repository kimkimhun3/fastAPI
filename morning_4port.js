let serverVideo = null;
let clientVideo = null;
let serverAudio = null;
let clientAudio = null;
let buffer1Server = null;
let buffer1Client = null;
let delayServer = null;
let delayClient = null;
let bufferTimeout = null;
let waitTimeout = null;
let isWaiting = false;
let bufferTime = 0;
let numPackets = 0;
let packetBuffer = [];
let waitingTime = 0;
let waitingTime1 = 0;
let repetitionBufferTime = 0;
let repetitionBufferTime1 = 0;
let enableRepetitionBuffer = false;
let enableRepetitionBuffer1 = false;
let decoderIp;
let decoderPort;
let packetLossPercentage = 0;
let enablePacketLoss = false;
let totalPacketsReceived = 0;
let packetsDropped = 0;
let buffer1PacketCount = 0;
let buffer1PacketBuffer = [];
let isWaiting1 = false;
let bufferTimeout1 = null;
let waitTimeout1 = null;
let isBuffering = false;
let isBufferingCycleRunning = false;
let isBuffering1CycleRunning = false;
let isDelaying = false;
let delayTime = 0;
const packetQueue = [];
let decoderPort1;


document.getElementById('buffer1-main-execute').addEventListener('click', handleBuffer1Execute);
document.getElementById('buffer2-main-execute').addEventListener('click', handleBuffer2Execute);
document.getElementById('delay-execute').addEventListener('click', handleDelayExecute)
document.getElementById('packet-loss-switch').addEventListener('change', handlePacketLossSwitch);
document.getElementById('input-packet-loss').addEventListener('input', handlePacketLossInput);



let inputEventListenerActive1 = false;
//Real time waitingTime
document.getElementById('buffer1-repetition').addEventListener('input', updateRepetitionBufferTime);
function updateRepetitionBufferTime (event) {
  repetitionBufferTime1 = parseInt(event.target.value, 10);
  if (isNaN(repetitionBufferTime1)) repetitionBufferTime1 = 0;
  waitingTime1 = enableRepetitionBuffer1 ? (repetitionBufferTime1 * 1000) + 1000 : 0;
};

function handleBuffer1Execute() {
  numPackets = parseInt(document.getElementById('buffer1-packets').value, 10);
  repetitionBufferTime1 = parseInt(document.getElementById('buffer1-repetition').value, 10);
  enableRepetitionBuffer1 = document.getElementById('buffer1-repetition-switch').checked;
  decoderIp = document.getElementById('output-address').value;
  decoderPort = parseInt(document.getElementById('input-port').value, 10);
  waitingTime1 = enableRepetitionBuffer1 ? (repetitionBufferTime1 * 1000) + 0 : 0;

  if ((numPackets === 0 && !enableRepetitionBuffer1) || (numPackets === 0 && (enableRepetitionBuffer1 && repetitionBufferTime1 === 0))) {
    // Case 1: Forward packets directly to decoder
    console.log("Forwarding packets directly to decoder.");
    if (!buffer1Server || !buffer1Client) {
      initializeBuffer1Server();
    }
    removeBufferPacketInputListener();
  } else if (numPackets > 0 && (!enableRepetitionBuffer1 || repetitionBufferTime1 === 0)) {
    // Case 2: One-time buffering and then forward
    console.log(`Buffering packets for ${numPackets} packets, then forwarding.`);
    performBuffer1SingleBuffering();
    removeBufferPacketInputListener();
  } else if (numPackets > 0 && enableRepetitionBuffer1) {
    // Case 3: Repetitive buffering and waiting
    console.log(`Repetitive buffering and waiting.`);
    if (!isBuffering1CycleRunning){
      startBuffer1BufferingCycle();
      addBufferPacketInputListener();
    } else {
      console.log("Buffering1 cycle is already running.")
    }
    
  }
}
function performBuffer1SingleBuffering() {
  console.log("1 Time buffering start....");
  // Initialize server if not already initialized
  if (!buffer1Server || !buffer1Client) {
    initializeBuffer1Server();
  }
}

function startBuffer1BufferingCycle() {
  console.log("Starting Buffer 1 buffering cycle...");

  // Ensure the UDP server is initialized
  if (!buffer1Server || !buffer1Client) {
    initializeBuffer1Server();
  }

  isBuffering1CycleRunning = true;
  // Buffering cycle logic
}

function sendBuffer1PacketsToDecoder() {
  console.log(`Sending buffered packets to decoder, buffer size: ${buffer1PacketBuffer.length}`);
  buffer1PacketBuffer.forEach(packet => {
    buffer1Server.send(packet, decoderPort, decoderIp, (err) => {
      if (err) {
        console.error(`Error sending packet to decoder: ${err.message}`);
      }
    });
  });
  buffer1PacketBuffer = []; // Clear the buffer after sending
}

function initializeBuffer1Server() {
  buffer1Server = dgram.createSocket('udp4');
  buffer1Client = dgram.createSocket('udp4');
  const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB

  buffer1Client.on('message', (msg, rinfo) => {
    if (shouldDropPacket()) {
      packetsDropped++;
      console.log(`Packet loss (${packetsDropped}`);
      return; // Drop the packet
    }
    if (isWaiting1) {
      //console.log("Forwarding packet directly to decoder while waiting.");
      buffer1Server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
      });
    } else if (numPackets > 0) {
      //console.log("Buffering packet.");
      buffer1PacketBuffer.push(msg);
      if (buffer1PacketBuffer.length >= numPackets) {
        if (!enableRepetitionBuffer1){
          sendBuffer1Packets();
        }

        if (enableRepetitionBuffer1 && waitingTime1 > 0) {
          isBuffering1CycleRunning = true;
          sendBuffer1PacketsToDecoder();
          isWaiting1 = true;
          console.log(`Waiting for ${waitingTime1 / 1000} seconds`);
          waitTimeout1 = setTimeout(() => {
            isWaiting1 = false;
            waitTimeout1 = null;
            if (!enableRepetitionBuffer1) {
              numPackets = 0;
              document.getElementById('buffer1-packets').value = numPackets;
              console.log("Repetition buffer disabled, setting numPackets to 0 and stopping buffering.");
            }// Continue buffering and sending packets
          }, waitingTime1);
        } else {
          isBuffering1CycleRunning = false;

        }
      }
    } else {
      //console.log("Forwarding packet directly to decoder.");
      buffer1Server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
      });
    }
  });

  buffer1Client.on('listening', () => {
    const address = buffer1Client.address();
    console.log(`Buffer1 Client listening on ${address.address}:${address.port}`);
    
    buffer1Client.setRecvBufferSize(BUFFER_SIZE);
    buffer1Client.setSendBufferSize(BUFFER_SIZE);
  });

  buffer1Server.on('listening', () => {
    const address = buffer1Server.address();
    console.log(`Buffer1 Server listening on ${address.address}:${address.port}`);
    
    buffer1Server.setRecvBufferSize(BUFFER_SIZE);
    buffer1Server.setSendBufferSize(BUFFER_SIZE);
  });

  // Bind client to a wildcard port to receive packets from any source
  buffer1Client.bind(decoderPort);

  // Bind server to local port for sending packets to decoder
  // buffer1Server.bind(0, localIP);
}

function sendBuffer1Packets() {
  console.log(`Length Buffer 1: ${buffer1PacketBuffer.length} length`);
  buffer1PacketBuffer.forEach(packet => {
    buffer1Server.send(packet, decoderPort, decoderIp, (err) => {
      if (err) {
        console.error(`Error sending packet to decoder: ${err.message}`);
      }
    });
  });

  buffer1PacketBuffer = [];
  numPackets = 0;
  document.getElementById('buffer1-packets').value = numPackets;
}

function addBufferPacketInputListener() {
  if (!inputEventListenerActive1) {
    document.getElementById('buffer1-packets').addEventListener('input', updateBufferPacket);
    inputEventListenerActive1 = true;
  }
}

function removeBufferPacketInputListener() {
  if (inputEventListenerActive1) {
    document.getElementById('buffer1-packets').removeEventListener('input', updateBufferPacket);
    inputEventListenerActive1 = false;
  }
}

function updateBufferPacket(event) {
  numPackets = parseInt(event.target.value, 10);
  if (isNaN(numPackets)) {
    numPackets = 0;
  }

  if (isBuffering1CycleRunning && bufferTimeout1) {
    clearTimeout(bufferTimeout1);
    bufferTimeout1 = setTimeout(() => {
      if (enableRepetitionBuffer1) {
        startBuffer1BufferingCycle();
      } else {
        performBuffer1SingleBuffering();
      }
    }, numPackets);
  }
}


//B2

let isRepetitiveBuffering = false;

//Real time waitingTime
document.getElementById('buffer2-repetition').addEventListener('input', (event) => {
  repetitionBufferTime = parseInt(event.target.value, 10);
  if (isNaN(repetitionBufferTime)) repetitionBufferTime = 0;
  waitingTime = enableRepetitionBuffer ? (repetitionBufferTime * 1000) + 0 : 0;
});


// Flag to track if the input event listener is active
let inputEventListenerActive = false;
// function handleBuffer2Execute() {
//   bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
//   repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
//   enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;
//   decoderIp = document.getElementById('output-address').value;
//   decoderPort = parseInt(document.getElementById('input-port').value, 10);
//   decoderPort1 = parseInt(document.getElementById('input-port1').value, 10);

//   waitingTime = enableRepetitionBuffer ? (repetitionBufferTime * 1000) + 0 : 0;
//   //isRepetitiveBuffering = bufferTime > 0 && enableRepetitionBuffer;

//   if ((bufferTime === 0 && !enableRepetitionBuffer) || (bufferTime === 0 && enableRepetitionBuffer && repetitionBufferTime === 0)) {
//     // Case 1: Forward packets directly to decoder
//     console.log("Forwarding packets directly to decoder.");
//     if (!serverVideo || !clientVideo || !serverAudio || !clientAudio) {
//       initializeServer();
//     }
//     // Ensure input event listener is removed
//     removeBufferTimeInputListener();
//   } else if (bufferTime > 0 && (!enableRepetitionBuffer || repetitionBufferTime === 0)) {
//     // Case 2: One-time buffering and then forward
//     console.log(`Buffering packets for ${bufferTime}ms, then forwarding.`);
//     performSingleBuffering();
//     // Ensure input event listener is removed
//     removeBufferTimeInputListener();
//   } else if (bufferTime > 0 && enableRepetitionBuffer) {
//     // Case 3: Repetitive buffering and waiting
//     console.log(`Repetitive buffering and waiting.`);
//     if (!isBufferingCycleRunning){
//       startBufferingCycle();
//       // Add input event listener only for Case 3
//       addBufferTimeInputListener();
//     } else {
//       console.log("Buffering cycle is already running.");
//     }

//   }

  
// }

// let sendCompleteFlag = false;
// function performSingleBuffering() {
//   // Initialize server if not already initialized
//   if (!serverVideo || !clientVideo || !serverAudio || !clientAudio) {
//     initializeServer();
//   }
//   bufferTimeout = setTimeout(() => {
//     sendBufferedPackets();
//     bufferTime = 0; 
//     document.getElementById('buffer2-times').value = bufferTime;
//     console.log("Buffering complete. Forwarding packets directly to decoder.");
//     removeBufferTimeInputListener();
//   }, bufferTime);
// }

// function startBufferingCycle() {
//   if (!serverVideo || !clientVideo || !serverAudio || !clientAudio) {
//     initializeServer();
//   }
//   isBufferingCycleRunning = true;
//   function performBuffering() {
//     sendBufferedPackets();
//     if (enableRepetitionBuffer && waitingTime > 0) {
//       isWaiting = true;
//       waitTimeout = setTimeout(() => {
//         isWaiting = false;
//         waitTimeout = null;
//         bufferTimeout = setTimeout(performBuffering, bufferTime);
//       }, waitingTime);
//     }  else {
//       isBufferingCycleRunning = false; // Reset the flag when the buffering cycle is complete
//       waitingTime = 0;
//       document.getElementById('buffer2-repetition').value = waitingTime;
//     }
//   }
//   bufferTimeout = setTimeout(performBuffering, bufferTime);
// }
// // function sendBufferedPackets() {
// //   const totalPackets = packetBuffer.length;
// //   console.log(`Buffered packet ${totalPackets}`);
// //   packetBuffer.forEach(packet => {
// //     serverVideo.send(packet, decoderPort, decoderIp, (err) => {
// //       if (err) {
// //         console.error(`Error sending packet to decoder: ${err.message}`);
// //       }
// //     });
// //   });
// //   console.log(`Sent ${totalPackets}`);
// //   packetBuffer = [];
// // }

// function sendBufferedPackets() {
//   const totalPackets = packetBuffer.length;
//   console.log(`Buffered packets: ${totalPackets}`);



//   // While loop to send packets one by one
//   while (packetBuffer.length > 0) {
//     // Send packet asynchronously to avoid blocking the event loop
//     const packet = packetBuffer.shift();

//     serverVideo.send(packet, decoderPort, decoderIp, (err) => {
//       if (err) {
//         console.error(`Error sending packet to decoder: ${err.message}`);
//       }
//     });

// //     console.log(`Sending packet ${index + 1} of ${totalPackets}`);

//   }
// }

function assignPorts() {
  let decoderPort = parseInt(document.getElementById('input-port').value, 10);
  let decoderPort1 = document.getElementById('input-port1').value;
  decoderPort1 = decoderPort1 ? parseInt(decoderPort1, 10) : null;

  if (decoderPort % 2 !== 0) {
    console.error("Error: input-port must be an even number.");
    return;
  }

  let rtpVideoPort = decoderPort;
  let rtcpVideoPort = decoderPort + 1;
  let rtpAudioPort = null;
  let rtcpAudioPort = null;

  if (decoderPort1 !== null) {
    if (decoderPort1 === decoderPort + 1) {
      console.log(`Ports assigned: RTP Video: ${rtpVideoPort}, RTCP Video: ${rtcpVideoPort}`);
    } else if (decoderPort1 === decoderPort + 2) {
      rtpAudioPort = decoderPort + 2;
      console.log(`Ports assigned: RTP Video: ${rtpVideoPort}, RTCP Video: ${rtcpVideoPort}, RTP Audio: ${rtpAudioPort}`);
    } else if (decoderPort1 === decoderPort + 3) {
      rtpAudioPort = decoderPort + 2;
      rtcpAudioPort = decoderPort + 3;
      console.log(`Ports assigned: RTP Video: ${rtpVideoPort}, RTCP Video: ${rtcpVideoPort}, RTP Audio: ${rtpAudioPort}, RTCP Audio: ${rtcpAudioPort}`);
    } else {
      console.error("Error: input-port1 must follow the correct sequence (input-port + 1, +2, or +3). ");
      return;
    }
  } else {
    console.log(`Ports assigned: RTP Video: ${rtpVideoPort}`);
  }
  return { rtpVideoPort, rtcpVideoPort, rtpAudioPort, rtcpAudioPort };
}

function handleBuffer2Execute() {
  let ports = assignPorts();
  if (!ports) return;
  bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
  repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
  enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;
  decoderIp = document.getElementById('output-address').value;
  // decoderPort = parseInt(document.getElementById('input-port').value, 10);
  // decoderPort1 = parseInt(document.getElementById('input-port1').value, 10);
  waitingTime = enableRepetitionBuffer ? repetitionBufferTime * 1000 : 0;

  if ((bufferTime === 0 && !enableRepetitionBuffer) || (bufferTime === 0 && enableRepetitionBuffer && repetitionBufferTime === 0)) {
    console.log("Forwarding packets directly to decoder.");
    if (!serverVideo || !clientVideo || !serverAudio || !clientAudio) {
      initializeServer();
    }
    removeBufferTimeInputListener();
  } else if (bufferTime > 0 && (!enableRepetitionBuffer || repetitionBufferTime === 0)) {
    console.log(`Buffering packets for ${bufferTime}ms, then forwarding.`);
    performSingleBuffering();
    removeBufferTimeInputListener();
  } else if (bufferTime > 0 && enableRepetitionBuffer) {
    console.log(`Repetitive buffering and waiting.`);
    if (!isBufferingCycleRunning) {
      startBufferingCycle();
      addBufferTimeInputListener();
    } else {
      console.log("Buffering cycle is already running.");
    }
  }
}

function performSingleBuffering() {
  if (!serverVideo || !clientVideo || !serverAudio || !clientAudio) {
    initializeServer();
  }

  bufferTimeout = setTimeout(() => {
    sendBufferedVideoPackets();
    sendBufferedAudioPackets();
    bufferTime = 0;
    document.getElementById('buffer2-times').value = bufferTime;
    console.log("Buffering complete. Forwarding packets directly to decoder.");
    removeBufferTimeInputListener();
  }, bufferTime);
}

function startBufferingCycle() {
  if (!serverVideo || !clientVideo || !serverAudio || !clientAudio) {
    initializeServer();
  }

  isBufferingCycleRunning = true;

  function performBuffering() {
    sendBufferedVideoPackets();
    sendBufferedAudioPackets();

    if (enableRepetitionBuffer && waitingTime > 0) {
      isWaiting = true;
      waitTimeout = setTimeout(() => {
        isWaiting = false;
        bufferTimeout = setTimeout(performBuffering, bufferTime);
      }, waitingTime);
    } else {
      isBufferingCycleRunning = false;
      waitingTime = 0;
      document.getElementById('buffer2-repetition').value = waitingTime;
    }
  }

  bufferTimeout = setTimeout(performBuffering, bufferTime);
}

function sendBufferedVideoPackets() {
  if (packetBuffer.length === 0) return;
  console.log(`Sending ${packetBuffer.length} video packets on port ${decoderPort}`);
  
  while (packetBuffer.length > 0) {
    const packet = packetBuffer.shift();
    serverVideo.send(packet, decoderPort, decoderIp, (err) => {
      if (err) {
        console.error(`Error sending video packet: ${err.message}`);
      }
    });
  }
}

function sendBufferedAudioPackets() {
  if (audioPacketBuffer.length === 0) return;
  console.log(`Sending ${audioPacketBuffer.length} audio packets on port ${decoderPort1}`);
  
  while (audioPacketBuffer.length > 0) {
    const packet = audioPacketBuffer.shift();
    serverAudio.send(packet, decoderPort1, decoderIp, (err) => {
      if (err) {
        console.error(`Error sending audio packet: ${err.message}`);
      }
    });
  }
}

// // function sendBufferedPackets() {
// //   const totalPackets = packetBuffer.length;
// //   console.log(`Buffered packet ${totalPackets}`);
// //   packetBuffer.forEach(packet => {
// //     serverVideo.send(packet, decoderPort, decoderIp, (err) => {
// //       if (err) {
// //         console.error(`Error sending packet to decoder: ${err.message}`);
// //       }
// //     });
// //   });
// //   console.log(`Sent ${totalPackets}`);
// //   packetBuffer = [];
// // }


let audioPacketBuffer = [];

function initializeServer(ports) {
    serverVideo = dgram.createSocket('udp4');
    clientVideo = dgram.createSocket('udp4');
    serverAudio = dgram.createSocket('udp4');
    clientAudio = dgram.createSocket('udp4');

    const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB
  
    clientVideo.on('message', (msg, rinfo) => {
      if (shouldDropPacket()) {
        packetsDropped++;
        console.log(`Packet loss (${packetsDropped}`);
        return; // Drop the packet
      }
  
      if (isWaiting) {
        serverVideo.send(msg, decoderPort, decoderIp, (err) => {
          if (err) {
            console.error(`Error forwarding packet to decoder: ${err.message}`);
          }
        });
      } else if (bufferTime > 0) {
        packetBuffer.push(msg);
      } else {
        serverVideo.send(msg, decoderPort, decoderIp, (err) => {
          if (err) {
            console.error(`Error forwarding packet to decoder: ${err.message}`);
          }
        });
      }
    });


    clientAudio.on('message', (msg, rinfo) => {
      if (shouldDropPacket()) {
        packetsDropped++;
        console.log(`Packet loss (${packetsDropped})`);
        return; // Drop the packet
      }
  
      if (isWaiting) {
        serverAudio.send(msg, decoderPort1, decoderIp, (err) => {
          if (err) {
            console.error(`Error forwarding audio packet to decoder: ${err.message}`);
          }
        });
      } else if (bufferTime > 0) {
        audioPacketBuffer.push(msg);
      } else {
        serverAudio.send(msg, decoderPort1, decoderIp, (err) => {
          if (err) {
            console.error(`Error forwarding audio packet to decoder: ${err.message}`);
          }
        });
      }
    });
  
    // clientVideo.on('listening', () => {
    //   const address = clientVideo.address();
    //   console.log(`Client listening on ${address.address}:${address.port}`);
      
    //   clientVideo.setRecvBufferSize(BUFFER_SIZE);
    //   clientVideo.setSendBufferSize(BUFFER_SIZE);
    // });
  
    // serverVideo.on('listening', () => {
    //   const address = serverVideo.address();
    //   console.log(`Server listening on ${address.address}:${address.port}`);
      
    //   serverVideo.setRecvBufferSize(BUFFER_SIZE);
    //   serverVideo.setSendBufferSize(BUFFER_SIZE);
    // });
  
    // Bind client to a wildcard port to receive packets from any source
    clientVideo.bind(decoderPort);
    clientAudio.bind(decoderPort1);
  
    // Bind server to local port for sending packets to decoder
}


// Implement Delay

let delayVideoServer = null;
let delayVideoClient = null;
let delayAudioServer = null;
let delayAudioClient = null;
let packetQueueAudio = [];
let packetQueueVideo = [];

function handleDelayExecute() {
  decoderIp = document.getElementById("output-address").value;
  decoderPort = parseInt(document.getElementById("input-port").value, 10);
  decoderPort1 = parseInt(document.getElementById("input-port1").value, 10);
  delayTime = parseInt(document.getElementById("delay-times").value, 10);

  if (!delayVideoClient || !delayVideoServer || !delayAudioClient || !delayAudioServer) {
    console.log("Initializing delay servers...");
    initializeDelay();
  }
  // Enable stop button if delay is applied
  document.getElementById("delay-stop").disabled = delayTime === 0;
  if (delayTime === 0 && packetQueue.length > 0) {
    console.log("Delay set to 0. Sending all queued packets immediately.");
    flushQueue();
  }
}

function initializeDelay() {
  delayVideoServer = dgram.createSocket("udp4");
  delayVideoClient = dgram.createSocket("udp4");
  delayAudioServer = dgram.createSocket("udp4");
  delayAudioClient = dgram.createSocket("udp4");

  delayVideoClient.on("message", (msg, rinfo) => {
    if (delayTime > 0) {
      packetQueueVideo.push({ msg, rinfo, timestamp: Date.now() });
      if (!isDelaying) startDelayedForwarding();
    } else {
      forwardPacket(msg, rinfo, 'video');
    }
    // Enable stop button if delay is active
    document.getElementById("delay-stop").disabled = delayTime === 0;
  });

  // Audio client handling
  delayAudioClient.on("message", (msg, rinfo) => {
    if (delayTime > 0) {
      packetQueueAudio.push({ msg, rinfo, timestamp: Date.now() });
      if (!isDelaying) startDelayedForwarding();
    } else {
      forwardPacket(msg, rinfo, 'audio');
    }
    // Enable stop button if delay is active
    document.getElementById("delay-stop").disabled = delayTime === 0;
  });

  // delayVideoServer.on("listening", () => {
  //   console.log(`Video server listening on port 6000`);
  // });
  // delayAudioServer.on("listening", () => {
  //   console.log(`Audio server listening on port 6001`);
  // });
  // delayVideoClient.on("listening", () => {
  //   console.log(`Video client listening on port 5004`);
  // });
  // delayAudioClient.on("listening", () => {
  //   console.log(`Audio client listening on port 5006`);
  // });
  // Note: Bind uses for receive
  delayVideoClient.bind(decoderPort); // Video port for input
  delayAudioClient.bind(decoderPort1); // Audio port for input
}


function startDelayedForwarding() {
  isDelaying = true;
  function processQueue() {
    if (packetQueueVideo.length === 0 && packetQueueAudio.length === 0) {
      isDelaying = false;
      document.getElementById("delay-stop").disabled = true; // Disable stop button
      return;
    }
    if (delayTime === 0) {
      console.log("Delay removed. Flushing queues immediately.");
      flushQueue();
      return;
    }
    const now = Date.now();
    // Process video queue
    while (packetQueueVideo.length > 0 && now - packetQueueVideo[0].timestamp >= delayTime) {
      const { msg } = packetQueueVideo.shift();
      forwardPacket(msg, { port: decoderPort }, 'video');
    }

    // Process audio queue
    while (packetQueueAudio.length > 0 && now - packetQueueAudio[0].timestamp >= delayTime) {
      const { msg } = packetQueueAudio.shift();
      forwardPacket(msg, { port: decoderPort1 }, 'audio');
    }

    setTimeout(processQueue);
  }

  setTimeout(processQueue, delayTime);
}

function flushQueue() {
  console.log("Flushing remaining packets in burst mode.");

  // Flush video packets
  while (packetQueueVideo.length > 0) {
    const { msg } = packetQueueVideo.shift();
    forwardPacket(msg, { port: decoderPort }, 'video');
  }

  // Flush audio packets
  while (packetQueueAudio.length > 0) {
    const { msg } = packetQueueAudio.shift();
    forwardPacket(msg, { port: decoderPort1 }, 'audio');
  }

  isDelaying = false;
}
function forwardPacket(msg, rinfo, type) {
  if (type === 'video') {
    delayVideoServer.send(msg, decoderPort, decoderIp, (err) => {
      if (err) console.error(`Error forwarding video packet: ${err.message}`);
    });
  } else if (type === 'audio') {
    delayAudioServer.send(msg, decoderPort1, decoderIp, (err) => {
      if (err) console.error(`Error forwarding audio packet: ${err.message}`);
    });
  }
}
// Stop Button Click Handler
document.getElementById("delay-stop").addEventListener("click", () => {
  console.log("Stop button clicked. Removing delay immediately.");
  delayTime = 0;
  document.getElementById("delay-times").value = 0;
  flushQueue();
});




////////////////////////////////End of Delay Function ////////////////////////////////


function handlePacketLossSwitch() {
  enablePacketLoss = document.getElementById('packet-loss-switch').checked;
  document.getElementById('input-packet-loss').disabled = !enablePacketLoss;
  document.getElementById('switch-text').textContent = enablePacketLoss ? 'ON' : 'OFF';

  if (!enablePacketLoss) {
    packetLossPercentage = 0; // Reset packet loss percentage when the switch is turned off
  }
}

function handlePacketLossInput() {
  const inputElement = document.getElementById('input-packet-loss');
  const inputValue = inputElement.value.trim(); // Trim to remove leading/trailing whitespace

  if (inputValue === '') {
    setPacketLoss(0); // Reset packet loss percentage to 0 when input is empty
  } else {
    const percentage = parseInt(inputValue, 10);
    setPacketLoss(percentage);
  }
}

// Function to set the packet loss percentage
function setPacketLoss(percentage) {
  if (percentage >= 0 && percentage <= 99) {
    packetLossPercentage = percentage;
    enablePacketLoss = percentage > 0;
    console.log(`Packet loss percentage set to ${percentage}%.`);
  } else {
    console.error('Invalid packet loss percentage. Please enter a value between 1 and 99.');
  }
}

function shouldDropPacket() {
  if (!enablePacketLoss) return false;
  const dropThreshold = packetLossPercentage / 100.0;
  const randomValue = Math.random();
  return randomValue < dropThreshold;
}


// Add input event listener to buffer2-times
function addBufferTimeInputListener() {
  if (!inputEventListenerActive) {
    document.getElementById('buffer2-times').addEventListener('input', updateBufferTime);
    inputEventListenerActive = true;
  }
}

// Remove input event listener from buffer2-times
function removeBufferTimeInputListener() {
  if (inputEventListenerActive) {
    document.getElementById('buffer2-times').removeEventListener('input', updateBufferTime);
    inputEventListenerActive = false;
  }
}

// Update bufferTime on input change
function updateBufferTime(event) {
  bufferTime = parseInt(event.target.value, 10);
  if (isNaN(bufferTime)) {
    bufferTime = 0;
  }
  // Ensure that the updated bufferTime is applied immediately
  if (isBuffering && bufferTimeout) {
    clearTimeout(bufferTimeout);
    bufferTimeout = setTimeout(() => {
      startBufferingCycle();
    }, bufferTime);
  }
}
