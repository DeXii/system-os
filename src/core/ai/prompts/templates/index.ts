import type { DirectorTaskPromptConfig } from '../../director/director-types';
import { renderAnalysisTemplate } from './analysis.template';
import { renderBriefingTemplate } from './briefing.template';
import { renderCognitiveTemplate } from './cognitive.template';
import { renderCommunicationTemplate } from './communication.template';
import { renderLibraryTemplate } from './library.template';
import { renderPlanningTemplate } from './planning.template';
import { renderNutritionTemplate } from './nutrition.template';
import { renderRegulationTemplate } from './regulation.template';
import { renderTrainingTemplate } from './training.template';

export function renderTaskTemplate(config: DirectorTaskPromptConfig): string {
  const p = config.templateParams ?? {};
  let body = '';
  switch (config.templateId) {
    case 'training':
      body = renderTrainingTemplate(p as Parameters<typeof renderTrainingTemplate>[0]);
      break;
    case 'briefing':
      body = renderBriefingTemplate(p as Parameters<typeof renderBriefingTemplate>[0]);
      break;
    case 'analysis':
      body = renderAnalysisTemplate(p as Parameters<typeof renderAnalysisTemplate>[0]);
      break;
    case 'cognitive':
      body = renderCognitiveTemplate(p as Parameters<typeof renderCognitiveTemplate>[0]);
      break;
    case 'regulation':
      body = renderRegulationTemplate();
      break;
    case 'nutrition':
      body = renderNutritionTemplate();
      break;
    case 'communication':
      body = renderCommunicationTemplate(p as Parameters<typeof renderCommunicationTemplate>[0]);
      break;
    case 'planning':
      body = renderPlanningTemplate(p as Parameters<typeof renderPlanningTemplate>[0]);
      break;
    case 'library':
      body = renderLibraryTemplate();
      break;
    default:
      body = '';
  }
  if (config.taskInstruction) {
    body = body ? `${body}\n${config.taskInstruction}` : config.taskInstruction;
  }
  return body;
}
