/**
 * Tests for the Spot-the-fake game logic.
 *
 * game.js is a plain browser script that also exports via module.exports, so the
 * real implementation is required directly — the assertions run against the code
 * that ships, not a copy.
 */
const { buildRound, verdictFor, shuffle, nextQueue } = require("../game.js");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

// The test lives in spot-the-fake/test/, so the app root is one level up.
const ROOT = join(__dirname, "..");
const rounds = JSON.parse(readFileSync(join(ROOT, "rounds.json"), "utf8"));

const failures = [];
const ok = (label, pass, detail) => {
	if (!pass) failures.push(label + (detail ? ` — ${detail}` : ""));
	console.log(`${pass ? "ok  " : "FAIL"}  ${label}${!pass && detail ? ` — ${detail}` : ""}`);
};

/* ---- round data ---- */

ok("rounds.json has rounds", Array.isArray(rounds) && rounds.length >= 5, String(rounds.length));

for (const round of rounds) {
	ok(`round ${round.id} has both images`, Boolean(round.real && round.fake));
	ok(`round ${round.id} real image exists on disk`, existsSync(join(ROOT, round.real)), round.real);
	ok(`round ${round.id} fake image exists on disk`, existsSync(join(ROOT, round.fake)), round.fake);
	ok(`round ${round.id} credits its source`, Boolean(round.credit && round.source));
	ok(`round ${round.id} source is a Wikipedia page`, String(round.source).includes("wikipedia.org"));
	ok(`round ${round.id} teaches at least 3 tells`, Array.isArray(round.tells) && round.tells.length >= 3,
		String(round.tells && round.tells.length));
}

const ids = rounds.map((r) => r.id);
ok("round ids are unique", new Set(ids).size === ids.length, ids.join(","));
ok("no round reuses an image path",
	new Set(rounds.flatMap((r) => [r.real, r.fake])).size === rounds.length * 2);

/* ---- buildRound: the fake must not always be in the same slot ---- */

const firstSlotReal = rounds.filter((round) => buildRound(round, () => 0.1).realIndex === 0).length;
const secondSlotReal = rounds.filter((round) => buildRound(round, () => 0.9).realIndex === 1).length;
ok("low random puts the real image first", firstSlotReal === rounds.length, String(firstSlotReal));
ok("high random puts the real image second", secondSlotReal === rounds.length, String(secondSlotReal));

const sample = buildRound(rounds[0], () => 0.1);
ok("buildRound carries the label, credit, source and tells",
	sample.label === rounds[0].label && sample.credit === rounds[0].credit &&
	sample.source === rounds[0].source && sample.tells.length === rounds[0].tells.length);
ok("buildRound produces exactly two cards", sample.cards.length === 2);
ok("the two cards are one real and one fake",
	sample.cards.filter((c) => c.kind === "real").length === 1 &&
	sample.cards.filter((c) => c.kind === "fake").length === 1);
ok("the real card points at the real image",
	sample.cards[sample.realIndex].src === rounds[0].real);
ok("the other card points at the fake",
	sample.cards[1 - sample.realIndex].src === rounds[0].fake);

/* ---- verdictFor ---- */

const round0 = rounds[0];
const built = buildRound(round0, () => 0.1); // real first
const right = verdictFor(0, built.realIndex, round0);
const wrong = verdictFor(1, built.realIndex, round0);
ok("picking the real image is correct", right.correct === true);
ok("picking the fake is wrong", wrong.correct === false);
ok("the wrong verdict says the other one was real", /other one/i.test(wrong.lead), wrong.lead);
ok("the correct verdict names the animal", right.lead.includes(round0.label.toLowerCase()), right.lead);
ok("both verdicts carry the tells to teach",
	right.tells.length === round0.tells.length && wrong.tells.length === round0.tells.length);

/* ---- shuffle / queue ---- */

const seq = [1, 2, 3, 4, 5];
ok("shuffle keeps every element", JSON.stringify(shuffle(seq, Math.random).slice().sort()) === JSON.stringify(seq));
ok("shuffle does not mutate its input", JSON.stringify(seq) === JSON.stringify([1, 2, 3, 4, 5]));
ok("shuffle is deterministic for a fixed random", JSON.stringify(shuffle(seq, () => 0)) === JSON.stringify(shuffle(seq, () => 0)));
ok("a queue holds every round once", nextQueue(rounds, Math.random).length === rounds.length);
ok("a queue contains each round exactly once",
	new Set(nextQueue(rounds, Math.random).map((r) => r.id)).size === rounds.length);

/* ---- the page wires the script and the data together ---- */

const html = readFileSync(join(ROOT, "index.html"), "utf8");
const game = readFileSync(join(ROOT, "game.js"), "utf8");
ok("index.html loads game.js", html.includes('src="game.js"'));
ok("game.js fetches rounds.json", game.includes('fetch("rounds.json")'), "rounds.json is loaded by the script, not the markup");
ok("index.html has the board container", html.includes('id="board"'));
ok("index.html has the verdict panel", html.includes('id="verdict"'));
ok("index.html credits Wikipedia", html.includes("Wikipedia"));
ok("index.html names the fake model", html.includes("flux.1-schnell"));
ok("index.html has no leftover build placeholder", !html.includes("__SPOT_THE_FAKE_SCRIPT__"));

console.log(failures.length ? `\n${failures.length} FAILED\n${failures.join("\n")}` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
