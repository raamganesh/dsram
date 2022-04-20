const cluster = require("cluster");
const runGrpcServer = require("./grpcServer");
const numCPUs = 8;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    const port = `1111${i}`;
    cluster.fork({
      PORT: port,
    });
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log("worker " + worker.process.pid + " died");
  });
} else {
  runGrpcServer();
}
