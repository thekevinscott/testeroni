/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export function catchFailures<T extends unknown[]>() {
  return (
    _1: unknown,
    _2: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const origFn = descriptor.value;
    descriptor.value = async function (...args: T) {
      try {
        return await origFn.apply(this, args);
      } catch (err) {
        console.error(err);
        // process.exit(1);
      }
      return undefined;
    };
    return descriptor;
  };
}


