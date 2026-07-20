import { describe, it, expect } from 'vitest';
import { toCsv, parseCsv } from './csv';

describe('csv', () => {
  it('roundtrips and preserves accents', () => {
    const rows = [{ a: 'Crème brûlée', b: 'x,y', c: 'line1\nline2' }];
    const csv = toCsv(rows);
    const back = parseCsv(csv);
    expect(back[0]).toEqual(rows[0]);
  });

  it('neutralizes formula injection', () => {
    const csv = toCsv([{ a: '=SUM(A1)', b: '+cmd', c: '@x', d: '-1' }]);
    expect(csv.split('\n')[1]).toContain("'=SUM(A1)");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'@x");
  });

  it('handles empty', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
