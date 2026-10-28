# Bloom Filter Username Check

A small vanilla JavaScript project that shows how a **Bloom filter** can answer
"is this username taken?" without asking the server most of the time.

No libraries: the hash functions, the bit array and the debounce are all written by hand.

## The problem

A sign-up form usually checks whether a username is free while the user types.
The simple way is to send a request to the server on every keystroke:

```
typing "mohammad"  →  m, mo, moh, moha, moham, mohamm, mohamma, mohammad
                   →  8 server requests for one username
```

With many users typing at once, that's a lot of requests and database lookups,
and most of them are for names that **don't exist anyway**.

## Step 1: Debounce

Instead of checking on every keystroke, wait until the user stops typing for 500 ms:

```js
clearTimeout(input.debounceTimeout);
input.debounceTimeout = setTimeout(() => {
  checkWithBloomFilter(value);
}, debounceTimeout);
```

Each keystroke cancels the previous timer and starts a new one, so the check only
runs once, for the final name. That turns 8 requests into 1.

## Step 2: Bloom filter

A Bloom filter is an array of bits (all `0` at the start) plus a few hash functions.
It can answer one question very cheaply:

> "Could this name be in the set?"

and it gives one of two answers:

| Answer | Meaning |
|---|---|
| **Definitely not** | 100% sure. No need to ask the server. |
| **Maybe** | Possibly there. Ask the server to be sure. |

### Adding a name

Every name is hashed by 3 hash functions. Each hash gives a position between 0 and 99,
and those 3 bits are turned on.

```
"ali"  →  hash1 = 55, hash2 = 9, hash3 = 46  →  turn on bits 55, 9, 46
```

### Checking a name

Hash the name the same way and look at its 3 bits:

- **At least one bit is off** → the name was never added, because adding it would
  have turned that bit on. It's **definitely available**, and the server is never asked.
- **All 3 bits are on** → the name **might** exist. Send one request to the server.

```js
function bloomFilterContains(username) {
  return getBitIndexes(username).every((index) =>
    bitsGrid.children[index].classList.contains("on")
  );
}
```

### False positives

Bits are shared between names. A new name can land on 3 bits that were each turned on
by **different** names, so the filter says "maybe" even though the name was never added.
That's a **false positive**: the server is asked, says the name is free, and the user
can register it.

The opposite (a false negative) can't happen: a registered name always has all 3 of its bits on.

So the filter never gives a wrong final answer. In the worst case it costs one extra
server request, which is what would have happened without it anyway.

## The hash function

All 3 hashes use the same function with different seeds. It's FNV-1a with a final
mixing step (MurmurHash3's `fmix32`) so that similar names like `ali` and `alj`
land on unrelated bits:

```js
const SEEDS = [2166136261, 12345, 98765];

function generateHash(username, range, seed) {
  let h = seed;
  for (let i = 0; i < username.length; i++) {
    h ^= username.charCodeAt(i);         // mix in the character
    h = Math.imul(h, 16777619) >>> 0;    // multiply by the FNV prime (32-bit)
  }
  // final mix: every input bit affects every output bit
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % range;              // position 0–99
}
```

- `Math.imul` multiplies as 32-bit integers, so JavaScript doesn't lose precision.
- `>>> 0` keeps the number positive, so `% range` never gives a negative index.

## Choosing the size

With `m` bits, `n` names and `k` hash functions:

- False-positive rate: `p ≈ (1 − e^(−k·n/m))^k`
- Best number of hashes: `k ≈ 0.69 · m / n`

This demo uses **100 bits and 3 hashes**, small enough to see on screen and to
produce false positives after a few dozen names:

| Names added | False-positive rate |
|---|---|
| 10 | ~1.7% |
| 20 | ~9% |
| 30 | ~21% |

A real system is much larger: 1 million usernames at a 1% false-positive rate needs
about 9.6 million bits (~1.2 MB) and 7 hash functions. That's tiny compared with
storing every username.

## What the page shows

- **Input + Register button**: type a name, register it if it's free.
  - Green border: available (by the filter or by the server).
  - Red border and disabled button: already taken.
- **Toggle**: turn the debounce and Bloom filter on or off to compare.
- **Hash 1 / 2 / 3**: the 3 bit positions of the current name.
- **Bit grid (100 bits)**: yellow bits are on, outlined bits are the ones being checked.
- **Stats**:
  - Server requests
  - Requests skipped by the Bloom filter
  - False positives
- **Users table**: every registered username.

## Try it

Open `index.html` in a browser. No build step or server is needed.

The page starts with 10 users already registered:
`ali, sara, omar, lina, ahmad, maya, karim, nour, rami, hala`.
Then type:

| Name | What happens |
|---|---|
| `olivia`, `test`, `root` | All 3 bits off → definitely available, no server request |
| `admin`, `georges` | 1 bit off → still definitely available, no server request |
| `ali` | All bits on → server request → taken |
| `user`, `lara`, `jihad` | All bits on → server request → **false positive**, available |

Then turn the toggle off and type any name: the request count goes up on every keystroke.

## Limitations

- **No deleting.** Turning a bit off could remove other names that share it.
  (A *counting* Bloom filter solves this.)
- **The "server" is an array in the page.** In a real app, the filter would be built
  from the database and sent to the client or kept at the edge, and the server
  would do the real lookup.
- Usernames are case-sensitive (`Ali` and `ali` hash differently).

## Files

```
index.html   page structure
style.css    layout and styles
script.js    debounce, hash function, Bloom filter, stats and users table
```
