const input = document.querySelector(".bloom-input");
const bloomToggle = document.querySelector(".bloom-toggle");
const bitsGrid = document.querySelector(".bits");
const registerButton = document.querySelector("button.register")
const usersTable = document.querySelector(".users-table")

const hashOutputs = [
  document.querySelector(".hash-output-1"),
  document.querySelector(".hash-output-2"),
  document.querySelector(".hash-output-3"),
];

const requestsCount = document.querySelector(".requests-count")
const skippedCount = document.querySelector(".skipped-count")
const falsePositiveCount = document.querySelector(".false-positive-count")

let serverRequestCount = 0;
let skippedRequestCount = 0;
let falsePositiveRequestCount = 0;
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
  setNameStatus(null);

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
  skippedRequestCount = 0;
  falsePositiveRequestCount = 0;
  updateStats();
  input.value = "";
  setNameStatus(null);
});

registerButton.addEventListener("click",()=>{
  if (input.value.trim()!=""){
    flipBitsOnRegister(input.value.trim())
    registerUserName(input.value.trim())
    updateTable()
    setNameStatus("exists")
  }
})

function setNameStatus(status) {
  input.classList.toggle("exists", status === "exists");
  input.classList.toggle("available", status === "available");
  registerButton.disabled = status === "exists";
}


function checkWithBloomFilter(value) {
  const userName = value.trim();
  if (userName === "") {
    return;
  }
  if (!bloomFilterContains(userName)) {
    console.log(`"${userName}" is definitely new, added without a server request.`);
    skippedRequestCount++;
    updateStats();
    setNameStatus("available");
  } else {
    sendServerRequest(userName, true);
  }
}

function updateStats() {
  requestsCount.textContent = serverRequestCount;
  skippedCount.textContent = skippedRequestCount;
  falsePositiveCount.textContent = falsePositiveRequestCount;
}

function bloomFilterContains(username) {
  return getBitIndexes(username).every((index) =>
    bitsGrid.children[index].classList.contains("on")
  );
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
    bitsGrid.children[index].classList.add("probe");
  });
}

function flipBitsOnRegister(username){
  getBitIndexes(username).forEach((index)=>{
    bitsGrid.children[index].classList.add("on")
  })
}

// askedByBloom: true when the bloom filter said "maybe" (all 3 bits on)
function sendServerRequest(value, askedByBloom = false) {
  if (value.trim() === "") {
    return;
  }
  console.log(`Sending server request for user name: "${value.trim()}"`);
  serverRequestCount++;
  if (checkUserName(value.trim())) {
    setNameStatus("exists");
    console.log(`User name "${value.trim()}" already exists in the array.`);
  } else {
    // the bloom filter said "maybe" but the server says no
    if (askedByBloom) {
      falsePositiveRequestCount++;
      console.log(`False positive: "${value.trim()}" doesn't exist.`);
    }
    setNameStatus("available");
  }
  updateStats();
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

function updateTable(){
  const tableBody = usersTable.tBodies[0]
  while (tableBody.rows.length > 1) {
    tableBody.deleteRow(1)
  }

  arr.forEach((name,index) =>{
    const tr = document.createElement("tr")
    const td_id = document.createElement("td")
    const td_name = document.createElement("td")
    td_id.textContent = index
    td_name.textContent = name

    tr.appendChild(td_id)
    tr.appendChild(td_name)

    tableBody.appendChild(tr)
  })
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