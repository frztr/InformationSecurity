/**
 * Первые простые числа для пробного деления. 10000-е простое равно 104729.
 */
export function buildSmallPrimeNumberTable(primeCount: number): readonly number[] {
  if (primeCount < 1) {
    throw new Error("Таблица малых простых должна содержать хотя бы одно число.");
  }

  const sieveLimit = Math.max(20, Math.ceil(primeCount * (Math.log(primeCount) + Math.log(Math.log(primeCount))) + 100));
  const isComposite = new Uint8Array(sieveLimit + 1);
  const primes: number[] = [];

  for (let candidate = 2; candidate <= sieveLimit && primes.length < primeCount; candidate += 1) {
    if (isComposite[candidate] !== 0) {
      continue;
    }
    primes.push(candidate);
    const start = candidate * candidate;
    if (start > sieveLimit) {
      continue;
    }
    for (let multiple = start; multiple <= sieveLimit; multiple += candidate) {
      isComposite[multiple] = 1;
    }
  }

  if (primes.length < primeCount) {
    throw new Error("Не удалось построить таблицу малого пробного деления запрошенного размера.");
  }

  return primes;
}
