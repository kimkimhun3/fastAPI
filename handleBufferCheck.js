document.getElementById('buffer1-check').addEventListener('change', handleBuffer1Check);
document.getElementById('buffer2-check').addEventListener('change', handleBuffer2Check);

function handleBuffer1Check(){
    const checkbox = document.getElementById('buffer1-check');
    if (checkbox.checked) {
      console.log('B1 Switched!');
      document.getElementById('buffer2-check').disabled = true;
    } else {
      document.getElementById('buffer2-check').disabled = false;
      document.getElementById('buffer1-packets').value = 0;
      document.getElementById('buffer1-repetition').value = 0;
      // Stop the server if it is running
      if (buffer1Server || buffer1Client) {
        buffer1Server.close();
        buffer1Client.close();
        buffer1Server = null;
        buffer1Client = null;
        console.log('B1 Client and Server stopped.');
      }
    }
  }
  function handleBuffer2Check() {
    const checkbox = document.getElementById('buffer2-check');
    
    if (checkbox.checked) {
      console.log('B2 Switched!');
      // Perform Buffer 2 function or related inputs
      //handleBuffer2Execute();
      document.getElementById('buffer1-check').disabled = true;
    } else {
      document.getElementById('buffer1-check').disabled = false;
      document.getElementById('buffer2-times').value = 0;
      document.getElementById('buffer2-repetition').value = 0;
      // Stop the server if it is running
      if (server || client) {
        server.close();
        client.close();
        client = null;
        server = null;
        console.log('B2 Client and Server stopped.');
      }
    }
  }
