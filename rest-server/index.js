const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const { performance } = require("perf_hooks");
const multiplyMatrixBlock = require("./multiplyMatrixBlock");
const utils = require("../utils/tools");
const app = express();

app.use(cors());
app.use(fileUpload());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});


app.post("/multiply", async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: "missing matrix" });
  }


  const deadline = parseInt(req.body.deadline);

  const fileA = req.files.A.data.toString().trim();
  const fileB = req.files.B.data.toString().trim();

  const matrixA = utils.textToMatrix(fileA);
  const matrixB = utils.textToMatrix(fileB);

  const dimension = matrixA.length;

  if (matrixA.length !== matrixB.length) {
    return res
      .status(400)
      .json({ error: "Matrix dimension are not equal" });
  }

  if (!utils.powerOfTwo(dimension)) {
    return res.status(400).json({
      error: "The matrix dimension must be in the form of power of 2",
    });
  }

  try {
    const p1 = performance.now();
    const resultingMatrix = await multiplyMatrixBlock(
      matrixA,
      matrixB,
      deadline
    );
    const p2 = performance.now();
    const totalTimeTaken = (p2 - p1) / 1000;

    console.log(
      "Resultant Matrix size: " +
        resultingMatrix[0].length +
        " in " +
        totalTimeTaken.toFixed(4) +
        " seconds with deadline (milliseconds): " +
        deadline
    );
    res.json(resultingMatrix).status(200);
  } catch (error) {
    console.log(error);
    res.status(500);
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("REST API is running on the port :" + port);
});
