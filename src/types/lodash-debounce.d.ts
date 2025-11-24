declare module 'lodash/debounce' {
  const debounce: <A extends unknown[], R>(
    func: (...args: A) => R,
    wait?: number,
    options?: { leading?: boolean; maxWait?: number; trailing?: boolean }
  ) => (...args: A) => R

  export default debounce
}
