import type { PromptTemplateId } from '../../director/director-types';
import { renderTaskTemplate } from '../templates';
import type { DirectorTaskPromptConfig } from '../../director/director-types';

export function renderTemplateById(
  templateId: PromptTemplateId,
  config: DirectorTaskPromptConfig
): string {
  return renderTaskTemplate({ ...config, templateId });
}
