import { describe, expect, it } from 'vitest';
import { resolveName, stripClassSuffix, toCamelCase, toKebabCase } from './naming.js';

describe('stripClassSuffix', () => {
  it('removes Component suffix', () => {
    expect(stripClassSuffix('CheckoutComponent')).toBe('Checkout');
  });
  it('removes EntryComponent suffix', () => {
    expect(stripClassSuffix('FooEntryComponent')).toBe('Foo');
  });
  it('removes Entry suffix', () => {
    expect(stripClassSuffix('FooEntry')).toBe('Foo');
  });
  it('leaves unsuffixed class names alone', () => {
    expect(stripClassSuffix('Foo')).toBe('Foo');
  });
});

describe('toCamelCase', () => {
  it.each([
    ['MyRemote', 'myRemote'],
    ['my-remote', 'myRemote'],
    ['my_remote', 'myRemote'],
    ['myRemote', 'myRemote'],
    ['checkout', 'checkout'],
  ])('%s -> %s', (input, expected) => {
    expect(toCamelCase(input)).toBe(expected);
  });
});

describe('toKebabCase', () => {
  it.each([
    ['myRemote', 'my-remote'],
    ['MyRemote', 'my-remote'],
    ['checkoutPage', 'checkout-page'],
    ['checkout', 'checkout'],
    ['HTTPClient', 'http-client'],
    ['ABCRemote', 'abc-remote'],
  ])('%s -> %s', (input, expected) => {
    expect(toKebabCase(input)).toBe(expected);
  });
});

describe('resolveName', () => {
  it('prefers explicit option', () => {
    const r = resolveName({ explicit: 'foo', packageName: '@x/bar', className: 'BazComponent' });
    expect(r).toEqual({ name: 'foo', explicit: true });
  });

  it('uses package name (unscoped) when explicit is absent', () => {
    const r = resolveName({ packageName: '@bimo-dk/checkout', className: 'EntryComponent' });
    expect(r).toEqual({ name: 'checkout', explicit: false });
  });

  it('uses package name with camelCase normalization', () => {
    const r = resolveName({ packageName: '@x/my-remote', className: 'EntryComponent' });
    expect(r).toEqual({ name: 'myRemote', explicit: false });
  });

  it('falls back to class name when package name is not camelCase-compatible', () => {
    const r = resolveName({ packageName: '123-invalid', className: 'CheckoutComponent' });
    expect(r).toEqual({ name: 'checkout', explicit: false });
  });

  it('falls back to class name when no package name is provided', () => {
    const r = resolveName({ className: 'OrderHistoryComponent' });
    expect(r).toEqual({ name: 'orderHistory', explicit: false });
  });

  it('uses fallback when class name strips to empty', () => {
    const r = resolveName({ className: 'Component', fallback: 'unknown' });
    expect(r).toEqual({ name: 'unknown', explicit: false });
  });
});
