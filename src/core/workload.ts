import type { TeamMember } from './team.js';
import type { Feature } from './project.js';
import { calculateSkillMatch, getAvailableHours, calculateLoadPercentage } from './team.js';

export interface AssignmentScore {
  member: TeamMember;
  score: number;
  skillMatch: number;
  loadPercentage: number;
  availableHours: number;
  missingSkills: string[];
}

export interface WorkloadSummary {
  member: TeamMember;
  assignedFeatures: string[]; // Feature IDs
  totalEstimate: number;
  loadPercentage: number;
  availableHours: number;
  isOverallocated: boolean;
}

/**
 * WorkloadAnalyzer calculates assignment scores and workload summaries
 */
export class WorkloadAnalyzer {
  /**
   * Calculate assignment score for a member and feature
   * score = skillMatch * (1 - loadPercentage/100)
   */
  calculateAssignmentScore(
    member: TeamMember,
    feature: Feature
  ): AssignmentScore {
    const skillMatch = calculateSkillMatch(member.skills, feature.skillsRequired);
    const loadPercentage = calculateLoadPercentage(member.currentLoad, member.capacity);
    const loadFactor = Math.max(0, 1 - loadPercentage / 100);
    const score = skillMatch * loadFactor;

    const memberSkillsSet = new Set(member.skills.map(s => s.toLowerCase()));
    const missingSkills = feature.skillsRequired.filter(
      skill => !memberSkillsSet.has(skill.toLowerCase())
    );

    return {
      member,
      score,
      skillMatch,
      loadPercentage,
      availableHours: getAvailableHours(member),
      missingSkills,
    };
  }

  /**
   * Rank team members by assignment score for a given feature
   * Returns top N candidates sorted by score (descending)
   */
  rankCandidates(
    team: TeamMember[],
    feature: Feature,
    topN: number = 3
  ): AssignmentScore[] {
    const scores = team.map(member => this.calculateAssignmentScore(member, feature));
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  /**
   * Generate workload summary for all team members
   */
  generateWorkloadSummary(
    team: TeamMember[],
    features: Feature[]
  ): WorkloadSummary[] {
    return team.map(member => {
      const assignedFeatures = features
        .filter(f => f.assignee === member.name)
        .map(f => f.id);

      const totalEstimate = features
        .filter(f => f.assignee === member.name)
        .reduce((sum, f) => sum + f.estimate, 0);

      const loadPercentage = calculateLoadPercentage(totalEstimate, member.capacity);
      const availableHours = getAvailableHours({
        ...member,
        currentLoad: totalEstimate,
      });

      return {
        member,
        assignedFeatures,
        totalEstimate,
        loadPercentage,
        availableHours,
        isOverallocated: totalEstimate > member.capacity,
      };
    });
  }

  /**
   * Find skills that are required but missing from the team
   */
  findSkillGaps(
    team: TeamMember[],
    features: Feature[]
  ): Map<string, string[]> {
    const teamSkills = new Set(
      team.flatMap(m => m.skills.map(s => s.toLowerCase()))
    );

    const skillGaps = new Map<string, string[]>();

    for (const feature of features) {
      const missingSkills = feature.skillsRequired.filter(
        skill => !teamSkills.has(skill.toLowerCase())
      );

      if (missingSkills.length > 0) {
        for (const skill of missingSkills) {
          if (!skillGaps.has(skill)) {
            skillGaps.set(skill, []);
          }
          skillGaps.get(skill)!.push(feature.id);
        }
      }
    }

    return skillGaps;
  }

  /**
   * Find skills with high demand (required by many features but few team members have it)
   */
  findHighDemandSkills(
    team: TeamMember[],
    features: Feature[]
  ): Map<string, { demandCount: number; memberCount: number }> {
    const skillDemand = new Map<string, Set<string>>(); // skill -> Set of feature IDs
    const skillSupply = new Map<string, number>(); // skill -> count of members

    // Count demand
    for (const feature of features) {
      for (const skill of feature.skillsRequired) {
        const key = skill.toLowerCase();
        if (!skillDemand.has(key)) {
          skillDemand.set(key, new Set());
        }
        skillDemand.get(key)!.add(feature.id);
      }
    }

    // Count supply
    for (const member of team) {
      for (const skill of member.skills) {
        const key = skill.toLowerCase();
        skillSupply.set(key, (skillSupply.get(key) || 0) + 1);
      }
    }

    // Find high demand skills (demanded by >=3 features, but <=1 member has it)
    const highDemand = new Map<string, { demandCount: number; memberCount: number }>();
    for (const [skill, featureIds] of skillDemand) {
      const demandCount = featureIds.size;
      const memberCount = skillSupply.get(skill) || 0;

      if (demandCount >= 3 && memberCount <= 1) {
        highDemand.set(skill, { demandCount, memberCount });
      }
    }

    return highDemand;
  }
}
