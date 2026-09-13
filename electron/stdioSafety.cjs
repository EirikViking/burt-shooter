// GUI launchers may close inherited pipes after the application has started.
// A disconnected logging sink must not turn a healthy game into an error dialog.
function installBrokenPipeGuards(streams = [process.stdout, process.stderr]) {
  for (const stream of streams) {
    stream?.on('error', (error) => {
      if (error?.code !== 'EPIPE') throw error;
    });
  }
}
module.exports = { installBrokenPipeGuards };
