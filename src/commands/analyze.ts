import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { WorkloadAnalyzer } from '../core/workload.js';
import { readTeamFile } from '../core/parser.js';
import { readFeatureFile } from '../core/parser.js';

const analyzeCommand = new Command('analyze')
  .description('Analyze team workload and provide assignment recommendations')
  .option('--recommend', 'Show assignment suggestions for unassigned features')
  .option('--skills', 'Show skill gap analysis')
  .option('--verbose', 'Show detailed analysis')
  .action(async (options, command) => {
    try {
      // Check if pmspec directory exists
      try {
        await readdir('pmspace');
      } catch {
        console.error(chalk.red('Error: pmspec directory not found. Run "pmspec init" first.'));
        process.exit(1);
      }

      // Load team data
      let team;
      try {
        team = await readTeamFile('pmspace/team.md');
      } catch {
        console.error(chalk.red('Error: team.md not found. Make sure team file exists.'));
        process.exit(1);
      }

      // Load all features
      const features = [];
      try {
        const featureFiles = await readdir('pmspace/features');
        for (const file of featureFiles) {
          if (file.endsWith('.md')) {
            const feature = await readFeatureFile(join('pmspace/features', file));
            features.push(feature);
          }
        }
      } catch {
        console.log(chalk.yellow('Warning: No features found.'));
      }

      const analyzer = new WorkloadAnalyzer();

      // Display workload summary
      displayWorkloadSummary(analyzer.generateWorkloadSummary(team.members, features));

      // Show recommendations if requested
      if (options.recommend) {
        showAssignmentRecommendations(analyzer, team.members, features);
      }

      // Show skill analysis if requested
      if (options.skills) {
        showSkillAnalysis(analyzer, team.members, features);
      }

    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

function displayWorkloadSummary(summary: any[]) {
  console.log(chalk.blue.bold('\n📊 Team Workload Summary'));
  console.log(chalk.gray('─'.repeat(60)));

  if (summary.length === 0) {
    console.log(chalk.yellow('No team members found.'));
    return;
  }

  // Create workload table
  const workloadTable = new Table({
    head: ['Member', 'Assigned', 'Load %', 'Available', 'Status'],
    colWidths: [15, 12, 10, 12, 15]
  });

  let totalAssigned = 0;
  let totalCapacity = 0;
  let overallocatedCount = 0;

  summary.forEach(member => {
    const { member: m, assignedFeatures, totalEstimate, loadPercentage, availableHours, isOverallocated } = member;

    totalAssigned += totalEstimate;
    totalCapacity += m.capacity;
    if (isOverallocated) overallocatedCount++;

    const status = isOverallocated
      ? chalk.red('OVERALLOCATED')
      : loadPercentage < 50
        ? chalk.yellow('UNDERUTILIZED')
        : chalk.green('BALANCED');

    const loadColor = loadPercentage > 100
      ? chalk.red
      : loadPercentage < 50
        ? chalk.yellow
        : chalk.green;

    workloadTable.push([
      m.name,
      `${assignedFeatures.length} feats`,
      loadColor(`${loadPercentage.toFixed(1)}%`),
      `${availableHours.toFixed(1)}h`,
      status
    ]);
  });

  console.log(workloadTable.toString());

  // Summary statistics
  const overallUtilization = totalCapacity > 0 ? (totalAssigned / totalCapacity) * 100 : 0;
  console.log(chalk.gray('\nSummary Statistics:'));
  console.log(`Total Team Capacity: ${totalCapacity.toFixed(1)}h/week`);
  console.log(`Total Assigned: ${totalAssigned.toFixed(1)}h/week`);
  console.log(`Overall Utilization: ${overallUtilization.toFixed(1)}%`);

  if (overallocatedCount > 0) {
    console.log(chalk.red(`⚠️  ${overallocatedCount} member(s) overallocated`));
  }

  // Find unassigned features
  const unassignedFeatures = summary
    .flatMap(m => m.assignedFeatures)
    .length; // This should be calculated differently

  console.log(chalk.gray('\nTeam Balance Analysis:'));
  const balancedMembers = summary.filter(m => !m.isOverallocated && m.loadPercentage >= 50);
  const underutilizedMembers = summary.filter(m => m.loadPercentage < 50);

  console.log(chalk.green(`✓ Balanced members: ${balancedMembers.length}`));
  if (underutilizedMembers.length > 0) {
    console.log(chalk.yellow(`⚠️  Underutilized members: ${underutilizedMembers.length}`));
  }
}

function showAssignmentRecommendations(analyzer: WorkloadAnalyzer, team: any[], features: any[]) {
  console.log(chalk.blue.bold('\n💡 Assignment Recommendations'));
  console.log(chalk.gray('─'.repeat(60)));

  const unassignedFeatures = features.filter(f => !f.assignee);

  if (unassignedFeatures.length === 0) {
    console.log(chalk.green('✓ All features are assigned!'));
    return;
  }

  console.log(chalk.yellow(`Found ${unassignedFeatures.length} unassigned feature(s):\n`));

  unassignedFeatures.forEach(feature => {
    console.log(chalk.bold(`Feature: ${feature.id} - ${feature.title}`));
    console.log(chalk.gray(`Estimate: ${feature.estimate}h | Skills: ${feature.skillsRequired.join(', ') || 'None'}`));

    const candidates = analyzer.rankCandidates(team, feature, 3);

    if (candidates.length > 0) {
      const recommendTable = new Table({
        head: ['Candidate', 'Score', 'Skill Match', 'Load %', 'Missing Skills'],
        colWidths: [15, 10, 12, 10, 20]
      });

      candidates.forEach(candidate => {
        const scoreColor = candidate.score >= 0.7
          ? chalk.green
          : candidate.score >= 0.4
            ? chalk.yellow
            : chalk.red;

        const skillColor = candidate.skillMatch >= 0.8
          ? chalk.green
          : candidate.skillMatch >= 0.5
            ? chalk.yellow
            : chalk.red;

        const loadColor = candidate.loadPercentage > 100
          ? chalk.red
          : candidate.loadPercentage > 70
            ? chalk.yellow
            : chalk.green;

        recommendTable.push([
          candidate.member.name,
          scoreColor(candidate.score.toFixed(2)),
          skillColor(`${(candidate.skillMatch * 100).toFixed(0)}%`),
          loadColor(`${candidate.loadPercentage.toFixed(0)}%`),
          candidate.missingSkills.length > 0 ? candidate.missingSkills.join(', ') : 'None'
        ]);
      });

      console.log(recommendTable.toString());
    } else {
      console.log(chalk.red('No suitable candidates found.'));
    }

    console.log();
  });
}

function showSkillAnalysis(analyzer: WorkloadAnalyzer, team: any[], features: any[]) {
  console.log(chalk.blue.bold('\n🔍 Skill Gap Analysis'));
  console.log(chalk.gray('─'.repeat(60)));

  // Find skill gaps
  const skillGaps = analyzer.findSkillGaps(team, features);

  if (skillGaps.size === 0) {
    console.log(chalk.green('✓ No skill gaps found! Team has all required skills.'));
  } else {
    console.log(chalk.yellow('Missing Skills:\n'));

    const skillGapTable = new Table({
      head: ['Missing Skill', 'Affected Features'],
      colWidths: [20, 40]
    });

    for (const [skill, featureIds] of skillGaps) {
      skillGapTable.push([
        chalk.red(skill),
        featureIds.join(', ')
      ]);
    }

    console.log(skillGapTable.toString());
  }

  // Find high demand skills
  const highDemandSkills = analyzer.findHighDemandSkills(team, features);

  if (highDemandSkills.size > 0) {
    console.log(chalk.yellow('\nHigh Demand Skills (bottleneck risk):\n'));

    const demandTable = new Table({
      head: ['Skill', 'Demand', 'Supply', 'Risk Level'],
      colWidths: [20, 10, 10, 15]
    });

    for (const [skill, { demandCount, memberCount }] of highDemandSkills) {
      const riskLevel = memberCount === 0
        ? chalk.red('CRITICAL')
        : memberCount === 1
          ? chalk.yellow('HIGH')
          : chalk.red('MEDIUM');

      demandTable.push([
        skill,
        demandCount.toString(),
        memberCount.toString(),
        riskLevel
      ]);
    }

    console.log(demandTable.toString());
  }

  // Show team skill overview
  console.log(chalk.blue('\n👥 Team Skill Overview:\n'));

  const allSkills = new Set<string>();
  team.forEach(member => member.skills.forEach(skill => allSkills.add(skill)));

  const skillTable = new Table({
    head: ['Skill', 'Team Members'],
    colWidths: [25, 35]
  });

  for (const skill of Array.from(allSkills).sort()) {
    const skilledMembers = team
      .filter(member => member.skills.some(s => s.toLowerCase() === skill.toLowerCase()))
      .map(member => member.name);

    skillTable.push([
      skill,
      skilledMembers.join(', ') || 'None'
    ]);
  }

  console.log(skillTable.toString());
}

export { analyzeCommand };