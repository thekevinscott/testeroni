export const hoistImports = (contents: string) => {
  const lines = contents.split('\n');
  const imports = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('import')) {
      imports.push(line.trim());
      lines[i] = '';
    }
  };
  return `${imports.join('\n')}
  ${lines.filter(Boolean).join('\n')}`;
};

