const fs = require("fs").promises;
const path = require("path");
const tf = require("@tensorflow/tfjs-node");
const nsfw = require("nsfwjs");
const { parseArgs } = require("node:util");

// Parse command line arguments
const { values: cliArgs } = parseArgs({
  options: {
    long: {
      type: "boolean",
      short: "l",
    },
    threshold: {
      type: "string",
      short: "t",
    },
  },
  allowPositionals: true,
});

const showTable = cliArgs.long;
const TABLE_THRESHOLD = cliArgs.threshold ? parseFloat(cliArgs.threshold) : 0.9;

async function processDirectory(dir, model, expectedStatus) {
  const files = (await fs.readdir(dir)).filter((file) =>
    [".png", ".jpg", ".jpeg"].includes(path.extname(file).toLowerCase())
  );

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const imagePath = path.join(dir, file);
        const imageBuffer = await fs.readFile(imagePath);
        const image = tf.node.decodeImage(imageBuffer, 3);
        const predictions = await model.classify(image);
        image.dispose();

        const topPrediction = predictions.reduce((max, current) =>
          max.probability > current.probability ? max : current
        );

        const probs = {};
        predictions.forEach((p) => {
          probs[p.className] = Number(p.probability.toFixed(3));
        });

        const status =
          ["Hentai", "Porn", "Sexy"].includes(topPrediction.className) &&
          topPrediction.probability > TABLE_THRESHOLD
            ? "PENDING"
            : "SAFE";

        return {
          source: path.basename(dir),
          file,
          Neutral: probs["Neutral"] || 0,
          Drawing: probs["Drawing"] || 0,
          Hentai: probs["Hentai"] || 0,
          Porn: probs["Porn"] || 0,
          Sexy: probs["Sexy"] || 0,
          topClass: topPrediction.className,
          topProb: Number(topPrediction.probability.toFixed(3)),
          status,
          expectedStatus,
        };
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
        return {
          source: path.basename(dir),
          file,
          Neutral: 0,
          Drawing: 0,
          Hentai: 0,
          Porn: 0,
          Sexy: 0,
          topClass: "ERROR",
          topProb: 0,
          status: "ERROR",
          expectedStatus,
        };
      }
    })
  );

  return results.filter((r) => r.status !== "ERROR");
}

async function analyzeImages() {
  const model = await nsfw.load(
    "https://raw.githubusercontent.com/kennotfindsymbol/test_model/refs/heads/main/model.json"
  );
  console.log(`Using threshold: ${TABLE_THRESHOLD}`);

  const pendingDir = "images/pendinglist";
  const safeDir = "images/safelist";

  const pendingResults = await processDirectory(pendingDir, model, "PENDING");
  const safeResults = await processDirectory(safeDir, model, "SAFE");

  // Calculate correct classifications
  const correctPending = pendingResults.filter(
    (r) => r.status === "PENDING"
  ).length;
  const totalPending = pendingResults.length;
  const correctSafe = safeResults.filter((r) => r.status === "SAFE").length;
  const totalSafe = safeResults.length;

  console.log(`
Pendinglist: ${correctPending}/${totalPending} correctly classified as PENDING
Safelist:   ${correctSafe}/${totalSafe} correctly classified as SAFE
  `);

  const allResults = [...pendingResults, ...safeResults];

  if (showTable) {
    console.log(
      `\nResults for custom table threshold (${TABLE_THRESHOLD.toFixed(3)}):`
    );
    console.table(allResults);
  }

  const misclassified = allResults.filter((r) => r.status !== r.expectedStatus);

  const csvFilename = "misclassified_images.csv";
  let csvContent = "source,file,topClass,topProb,status,expectedStatus\n";
  misclassified.forEach((entry) => {
    csvContent += `${entry.source},${entry.file},${entry.topClass},${entry.topProb},${entry.status},${entry.expectedStatus}\n`;
  });
  await fs.writeFile(csvFilename, csvContent);

  console.log(`\nWrote misclassified images to ${csvFilename}`);
}

analyzeImages().catch(console.error);
