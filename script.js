const input = document.querySelector(".bloom-input");
const bloomToggle = document.querySelector(".bloom-toggle");
const bitsGrid = document.querySelector(".bits");

const hashOutputs = [
  document.querySelector(".hash-output-1"),
  document.querySelector(".hash-output-2"),
  document.querySelector(".hash-output-3"),
];

let serverRequestCount = 0;
let debounceTimeout = 500;
const SEEDS = [2166136261, 12345, 98765];

let arr = [];

for (let i = 0; i <= 99; i++) {
  const bit = document.createElement("div");
  bit.classList.add("bit");
  bit.id = i;
  bit.textContent = i;
  bitsGrid.appendChild(bit);
}

input.addEventListener("input", (event) => {
  const value = event.target.value;

  if (!bloomToggle.checked) {
    sendServerRequest(value);
  } else {
    clearTimeout(input.debounceTimeout);
    input.debounceTimeout = setTimeout(() => {
      showHashes(value);
      checkWithBloomFilter(value);
    }, debounceTimeout);
  }
});

bloomToggle.addEventListener("change", () => {
  serverRequestCount = 0;
  document.querySelector(".server-data .count").textContent =
    serverRequestCount;
  input.value = "";
});

function checkWithBloomFilter(value) {
  const userName = value.trim();
  if (userName === "") {
    return;
  }
  if (!bloomFilterContains(userName)) {
    console.log(`"${userName}" is definitely new, added without a server request.`);
    registerUserName(userName);
  } else {
    sendServerRequest(userName);
  }
}

function bloomFilterContains(username) {
  return getBitIndexes(username).every((index) => {
    bitsGrid.children[index].classList.contains("on");
  });
}

function showHashes(userName) {
  for (const bit of bitsGrid.children) {
    bit.classList.remove("probe");
  }
  if (userName === "") {
    hashOutputs.forEach((output) => (output.textContent = 0));
    return;
  }
  getBitIndexes(userName).forEach((index, i) => {
    hashOutputs[i].textContent = index;
    bitsGrid.children[index].classList.add("probe", "on");
  });
}

function sendServerRequest(value) {
  if (value.trim() === "") {
    return;
  }
  console.log(`Sending server request for user name: "${value.trim()}"`);
  serverRequestCount++;
  document.querySelector(".server-data .count").textContent =
    serverRequestCount;
  if (!checkUserName(value.trim())) {
    arr.push(value.trim());
  } else {
    input.classList.add("exists");
    console.log(`User name "${value.trim()}" already exists in the array.`);
  }
}

function registerUserName(userName) {
  if (!arr.includes(userName)) {
    arr.push(userName);
  }
}

function checkUserName(userName) {
  return arr.includes(userName);
}

function turnOnBit(index) {
  bitsGrid.children[index].classList.add("on");
}

function getBitIndexes(userName) {
  return SEEDS.map((seed) =>
    generateHash(userName, bitsGrid.children.length, seed),
  );
}

function generateHash(username, range, seed) {
  let h = seed;
  for (let i = 0; i < username.length; i++) {
    h ^= username.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % range;
}
