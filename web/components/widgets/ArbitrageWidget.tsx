"use client";

import { useState } from "react";

type Outcome = { id: number; name: string; bookmaker: string; odds: string };

const INITIAL_OUTCOMES: Outcome[] = [
  { id: 1, name: "Home", bookmaker: "", odds: "2.00" },
  { id: 2, name: "Away", bookmaker: "", odds: "2.00" },
];

function formatMoney(amount: number): string {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function allocateStakes(bankroll: number, probabilities: number[], totalProbability: number): number[] {
  const totalCents = Math.round(bankroll * 100);
  const exactCents = probabilities.map((probability) => (totalCents * probability) / totalProbability);
  const stakes = exactCents.map(Math.floor);
  let remainingCents = totalCents - stakes.reduce((sum, stake) => sum + stake, 0);
  const order = exactCents
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; remainingCents > 0; i += 1) {
    stakes[order[i % order.length].index] += 1;
    remainingCents -= 1;
  }

  return stakes.map((stake) => stake / 100);
}

export default function ArbitrageWidget() {
  const [bankroll, setBankroll] = useState("100");
  const [outcomes, setOutcomes] = useState(INITIAL_OUTCOMES);
  const parsedBankroll = Number(bankroll);
  const parsedOdds = outcomes.map((outcome) => Number(outcome.odds));
  const isValid = Number.isFinite(parsedBankroll) && parsedBankroll > 0 &&
    parsedOdds.every((odds) => Number.isFinite(odds) && odds > 1);
  const totalProbability = isValid ? parsedOdds.reduce((sum, odds) => sum + 1 / odds, 0) : NaN;
  const isArbitrage = isValid && totalProbability < 1;
  const stakes = isArbitrage
    ? allocateStakes(parsedBankroll, parsedOdds.map((odds) => 1 / odds), totalProbability)
    : [];
  const potentialProfit = isArbitrage ? parsedBankroll * (1 / totalProbability - 1) : 0;

  const updateOutcome = (id: number, field: keyof Omit<Outcome, "id">, value: string) => {
    setOutcomes((current) => current.map((outcome) => outcome.id === id ? { ...outcome, [field]: value } : outcome));
  };

  const addOutcome = () => {
    if (outcomes.length >= 8) return;
    setOutcomes((current) => {
      const id = Math.max(...current.map((outcome) => outcome.id)) + 1;
      return [...current, { id, name: `Outcome ${current.length + 1}`, bookmaker: "", odds: "2.00" }];
    });
  };

  return (
    <div className="p-2 space-y-2 text-[11px]">
      <div className="dim">
        Enter the best decimal odds you have for each mutually exclusive outcome.
      </div>

      <label className="flex items-center justify-between gap-2">
        <span>TEST BANKROLL (USD)</span>
        <input
          aria-label="Test bankroll in USD"
          type="number"
          min="0.01"
          step="0.01"
          value={bankroll}
          onChange={(event) => setBankroll(event.target.value)}
          className="w-28 text-right"
        />
      </label>

      <div className="space-y-1">
        {outcomes.map((outcome, index) => (
          <div key={outcome.id} className="grid grid-cols-[1fr_1fr_5rem_auto] gap-1 items-center">
            <input
              aria-label={`Outcome ${index + 1} name`}
              value={outcome.name}
              onChange={(event) => updateOutcome(outcome.id, "name", event.target.value)}
              placeholder="Outcome"
            />
            <input
              aria-label={`Outcome ${index + 1} bookmaker`}
              value={outcome.bookmaker}
              onChange={(event) => updateOutcome(outcome.id, "bookmaker", event.target.value)}
              placeholder="Bookmaker"
            />
            <input
              aria-label={`Outcome ${index + 1} decimal odds`}
              type="number"
              min="1.01"
              step="0.01"
              value={outcome.odds}
              onChange={(event) => updateOutcome(outcome.id, "odds", event.target.value)}
              className="text-right"
            />
            {outcomes.length > 2 && (
              <button
                type="button"
                aria-label={`Remove ${outcome.name || `outcome ${index + 1}`}`}
                onClick={() => setOutcomes((current) => current.filter((item) => item.id !== outcome.id))}
                className="dim hover:text-[var(--down)] px-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button type="button" className="term-btn" onClick={addOutcome} disabled={outcomes.length >= 8}>
          + OUTCOME
        </button>
        <span className="dim">DECIMAL ODDS · MANUAL INPUT</span>
      </div>

      {!isValid ? (
        <div className="border-t border-[var(--border)] pt-2 down">
          Enter a bankroll above zero and decimal odds greater than 1 for every outcome.
        </div>
      ) : isArbitrage ? (
        <div className="border-t border-[var(--border)] pt-2 space-y-1">
          <div className="up font-bold">ARBITRAGE FOUND · {((1 - totalProbability) * 100).toFixed(2)}% margin</div>
          <div className="flex justify-between"><span>ESTIMATED PROFIT</span><span className="up">{formatMoney(potentialProfit)}</span></div>
          <div className="flex justify-between"><span>ESTIMATED RETURN</span><span>{formatMoney(parsedBankroll + potentialProfit)}</span></div>
          {outcomes.map((outcome, index) => (
            <div key={outcome.id} className="flex justify-between gap-2">
              <span className="truncate">{outcome.name || `Outcome ${index + 1}`} · {outcome.bookmaker || "Bookmaker"}</span>
              <span className="shrink-0">{formatMoney(stakes[index])} @ {parsedOdds[index].toFixed(2)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-t border-[var(--border)] pt-2 dim">
          No arbitrage at these odds · combined implied probability {(totalProbability * 100).toFixed(2)}%.
        </div>
      )}

      <div className="dim text-[10px]">
        Analysis only: odds are user-provided, may change, and do not account for fees, limits, voids, or bet acceptance. No bets are placed.
      </div>
    </div>
  );
}
