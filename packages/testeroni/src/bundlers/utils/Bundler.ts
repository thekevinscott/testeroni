import path from 'path';

export class Bundler {
  public dist = 'dist';
  public outDir: string;
  public usesRegistry = true;

  constructor(outDir: string) {
    this.outDir = outDir;
  }

  get name(): string { // skipcq: JS-0105
    throw new Error("Extend this class and implement the name getter");
  }

  get absoluteDistFolder() {
    return path.resolve(this.outDir, this.dist);
  }
}
