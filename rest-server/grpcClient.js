const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const { performance } = require("perf_hooks");
const utils = require("../utils/tools");
const blockMult = require("../utils/blockmult");
const PROTO_PATH = "blockmult.proto";

const definition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  arrays: true,
});

const BlockMultService = grpc.loadPackageDefinition(definition)
  .BlockMultService;

function createGrpcClient(i) {
  const port = process.env.PORT || `1111${i}`;
  const host = process.env.HOST || "0.0.0.0";
  const address = `${host}:${port}`;
  const client = new BlockMultService(
    address,
    grpc.credentials.createInsecure()
  );

  return client;
}

const constants = {
  deadline: 50,

  footprint: -1,

  numberOfCalls: 7,

  clients: [{ client: createGrpcClient(0), id: 0 }],

  clientIndex: 0,
};

function scale() {
  let numberOfClients = Math.ceil(
    (constants.footprint * constants.numberOfCalls) /
      Math.abs(constants.deadline - constants.footprint)
  );

  console.log("footprint value: " + constants.footprint);

  if (numberOfClients > 8) {
    numberOfClients = 8;
  }

  console.log("Scaled to: " + numberOfClients);

  for (let i = 1; i < numberOfClients; i++) {
    constants.clients[i] = {
      id: i,
      client: createGrpcClient(i),
    };
  }
}

function getClient() {
  const client = constants.clients[constants.clientIndex];
  constants.clientIndex = ++constants.clientIndex % constants.clients.length;

  if (!client) {
    console.log("Not able get an available client.");
    process.exit(1);
  }

  return client;
}

function resetGrpcClient() {
  constants.clientIndex = 0;
  constants.footprint = -1;
  

  for (const clientObj of constants.clients) {
    clientObj.client.close();
  }

  constants.clients = [{ client: createGrpcClient(0), id: 0 }];
}

function setDeadline(deadline) {
  constants.deadline = deadline;
}

async function multiplyBlockRPC(A, B, MAX) {
  const client = await getClient();

  console.log("Client used : " + (client.id + 1));

  return new Promise((resolve, reject) => {
    const block = utils.createBlock(A, B, MAX);
    const footPrintTimer1 = performance.now();

    client.client.multiplyBlock(block, (err, res) => {
      if (err) reject(err);

      if (constants.footprint === -1) {
        constants.footprint = performance.now() - footPrintTimer1;
        scale();
      }

      const matrix = utils.convertProtoBufToArray(res.block);
      resolve(matrix);
    });
  });
}

async function addBlockRPC(A, B, MAX) {
  const client = await getClient();

  console.log("Client Used : " + (client.id + 1));

  return new Promise((resolve, reject) => {
    const block = utils.createBlock(A, B, MAX);

    client.client.addBlock(block, (err, res) => {
      if (err) reject(err);
      client.isAvailable = true;

      const matrix = utils.convertProtoBufToArray(res.block);
      resolve(matrix);
    });
  });
}

module.exports = {
  addBlockRPC,
  multiplyBlockRPC,
  resetGrpcClient,
  setDeadline,
};
