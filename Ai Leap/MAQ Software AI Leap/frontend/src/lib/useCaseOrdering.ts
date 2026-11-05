type UseCaseWithCodebase = {
  title?: string;
  has_code?: boolean | null;
};

const hasCodebase = (useCase: UseCaseWithCodebase) => Boolean(useCase.has_code);

export const compareUseCasesByPriority = (
  left: UseCaseWithCodebase,
  right: UseCaseWithCodebase,
) => {
  const leftHasCodebase = hasCodebase(left);
  const rightHasCodebase = hasCodebase(right);

  if (leftHasCodebase !== rightHasCodebase) {
    return Number(rightHasCodebase) - Number(leftHasCodebase);
  }

  return String(left.title ?? "").localeCompare(String(right.title ?? ""));
};