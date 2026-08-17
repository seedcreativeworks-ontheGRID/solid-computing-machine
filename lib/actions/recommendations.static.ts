// Static-export stand-in for recommendations.ts — swapped in by
// scripts/static-export.sh for the GitHub Pages build, which has no server
// or database. Deliberately NOT a Server Action ("use server" is
// unsupported with output: "export") and does not import Prisma. The UI
// reacts via RecommendationCard's own local optimistic state; these calls
// are no-ops that exist only so the component's import doesn't break.
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function approveRecommendation(recommendationId: string) {}

export async function dismissRecommendation(recommendationId: string) {}
