const fs = require("fs");
const path = require("path");

const cardsDir = path.join(__dirname, "assets/cards");

const files = fs
  .readdirSync(cardsDir)
  .filter(file => /\.(png|jpg)$/i.test(file))
  .sort();

fs.writeFileSync(
  path.join(__dirname, "cards.json"),
  JSON.stringify(files, null, 2)
);

console.log("cards.json generated successfully!");