import { describe, it, expect } from 'vitest';
import { parseDraftReply } from '../src/services/productDraftService.js';

const valid = {
  slug: 'write-path-guard',
  title: 'Write-Path Guard',
  fact: 'Write-Path Guard: blocks duplicate tool writes after timeouts. USD 59.',
  priceUsd: 59,
  rationale: 'Repeated duplicate-invoice complaints without a covering product.',
};

describe('parseDraftReply', () => {
  it('accepts a well-formed draft and extracts the JSON object from prose', () => {
    const parsed = parseDraftReply(`Here you go: ${JSON.stringify(valid)} thanks`);
    expect(parsed).toEqual(valid);
  });

  it('rejects non-JSON and broken JSON', () => {
    expect(parseDraftReply('no json here')).toBeNull();
    expect(parseDraftReply('{"slug": ')).toBeNull();
  });

  it('rejects slugs that collide with the catalog or have a bad shape', () => {
    expect(parseDraftReply(JSON.stringify({ ...valid, slug: 'playbook' }))).toBeNull();
    expect(parseDraftReply(JSON.stringify({ ...valid, slug: 'Has Spaces' }))).toBeNull();
    expect(parseDraftReply(JSON.stringify({ ...valid, slug: 'single' }))).toBeNull();
  });

  it('rejects prices outside the allowed band', () => {
    expect(parseDraftReply(JSON.stringify({ ...valid, priceUsd: 1 }))).toBeNull();
    expect(parseDraftReply(JSON.stringify({ ...valid, priceUsd: 5000 }))).toBeNull();
    expect(parseDraftReply(JSON.stringify({ ...valid, priceUsd: 'fifty' }))).toBeNull();
  });

  it('rejects drafts that contain links', () => {
    expect(parseDraftReply(JSON.stringify({ ...valid, fact: 'See https://example.com for details' }))).toBeNull();
    expect(parseDraftReply(JSON.stringify({ ...valid, rationale: 'visit www.example.com' }))).toBeNull();
  });

  it('rejects oversized fields', () => {
    expect(parseDraftReply(JSON.stringify({ ...valid, title: 'x'.repeat(81) }))).toBeNull();
    expect(parseDraftReply(JSON.stringify({ ...valid, fact: 'x'.repeat(201) }))).toBeNull();
  });
});
