export const anyTruthness = (obj: Record<string, boolean>): boolean => {
  return Object.values(obj).some((v) => v);
};
