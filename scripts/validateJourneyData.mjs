import fs from 'fs';
import path from 'path';

/**
 * Script de validação técnica da Jornada 2tech.
 * Garante a integridade do arquivo src/data/journeyData.ts.
 */

const filePath = path.join(process.cwd(), 'src/data/journeyData.ts');

async function validate() {
  console.log('🔍 Iniciando validação técnica da jornada...');

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ Erro ao ler arquivo: ${filePath}`);
    process.exit(1);
  }

  // Hack para extrair dados do TS sem dependências de transpilação pesadas
  const jsContent = content
    .replace(/import\s+.*\s+from\s+['"].*['"];/g, '') 
    .replace(/:\s*Phase\[\]/g, '')                   
    .replace(/:\s*AreaType\[\]/g, '')               
    .replace(/as\s*AreaType\[\]/g, '')              
    .replace(/export\s+const\s+journeyPhases/g, 'const journeyPhases');

  let journeyPhases;
  try {
    const script = new Function(`${jsContent}; return journeyPhases;`);
    journeyPhases = script();
  } catch (err) {
    console.error('❌ Erro crítico: Falha ao processar arquivo TypeScript. Verifique erros de sintaxe básica.');
    console.error(err.message);
    process.exit(1);
  }

  const errors = [];
  const validAreas = ['cadastros', 'operacional', 'financeiro', 'relatorios', 'gestao', 'todos'];
  const validTypes = ['Material', 'Checkpoint', 'Task', 'Evidence', 'Pre-Meeting'];
  const validMeetingTypes = ['meeting_1_parametrizacao', 'meeting_2_operacao', 'meeting_3_financeiro'];

  const phaseIds = new Set();
  const phaseOrders = new Set();
  const moduleIds = new Set();

  if (!Array.isArray(journeyPhases) || journeyPhases.length !== 7) {
    errors.push(`A jornada deve ter exatamente 7 fases. Encontrado: ${journeyPhases?.length || 0}`);
  }

  journeyPhases.forEach((phase, index) => {
    const pPrefix = `Fase [${phase.id || 'sem id'} - ${phase.title || 'sem título'}]`;

    if (!phase.id) errors.push(`${pPrefix}: ID é obrigatório.`);
    if (!phase.title) errors.push(`${pPrefix}: Título é obrigatório.`);
    if (!phase.description) errors.push(`${pPrefix}: Descrição é obrigatória.`);
    if (typeof phase.order !== 'number') errors.push(`${pPrefix}: order deve ser um número.`);
    if (typeof phase.hasMeeting !== 'boolean') errors.push(`${pPrefix}: hasMeeting deve ser boolean.`);
    if (!Array.isArray(phase.modules)) errors.push(`${pPrefix}: modules deve ser um array.`);
    if (!Array.isArray(phase.quiz)) errors.push(`${pPrefix}: quiz deve ser um array.`);

    if (phase.id && phaseIds.has(phase.id)) errors.push(`${pPrefix}: ID de fase duplicado: ${phase.id}`);
    if (phase.id) phaseIds.add(phase.id);

    if (typeof phase.order === 'number' && phaseOrders.has(phase.order)) errors.push(`${pPrefix}: Order duplicado: ${phase.order}`);
    if (typeof phase.order === 'number') phaseOrders.add(phase.order);

    if (phase.hasMeeting) {
      if (!phase.meetingType) errors.push(`${pPrefix}: hasMeeting é true, mas meetingType está ausente.`);
      if (phase.meetingType && !validMeetingTypes.includes(phase.meetingType)) {
        errors.push(`${pPrefix}: meetingType inválido: ${phase.meetingType}`);
      }
      if (!phase.meetingTitle) errors.push(`${pPrefix}: hasMeeting é true, mas meetingTitle está ausente.`);
    }

    const expectedIds = ['fase-0', 'fase-1', 'fase-2', 'fase-3', 'fase-4', 'fase-5', 'fase-6'];
    if (phase.id && phase.id !== expectedIds[index]) {
      errors.push(`${pPrefix}: Ordem incorreta. ID esperado na posição ${index} era ${expectedIds[index]}, mas encontrou ${phase.id}.`);
    }

    const phasesWithMeeting = ['fase-1', 'fase-2', 'fase-3'];
    if (phase.hasMeeting && !phasesWithMeeting.includes(phase.id)) {
      errors.push(`${pPrefix}: Apenas fase-1, fase-2 e fase-3 devem ter encontro.`);
    }
    if (!phase.hasMeeting && phasesWithMeeting.includes(phase.id)) {
      errors.push(`${pPrefix}: Esta fase deveria ter hasMeeting: true.`);
    }

    const minModules = {
      'fase-0': 3, 'fase-1': 10, 'fase-2': 8, 'fase-3': 7, 'fase-4': 10, 'fase-5': 4, 'fase-6': 4
    };
    if (phase.id && phase.modules && phase.modules.length < minModules[phase.id]) {
      errors.push(`${pPrefix}: Quantidade insuficiente de módulos. Mínimo: ${minModules[phase.id]}, Encontrado: ${phase.modules.length}.`);
    }

    if (Array.isArray(phase.modules)) {
      phase.modules.forEach(module => {
        const mPrefix = `Fase ${phase.id}, Módulo [${module.id || 'sem id'} - ${module.title || 'sem título'}]`;

        if (!module.id) errors.push(`${mPrefix}: ID é obrigatório.`);
        if (module.id && moduleIds.has(module.id)) errors.push(`${mPrefix}: ID de módulo duplicado na jornada: ${module.id}`);
        if (module.id) moduleIds.add(module.id);

        if (!module.title) errors.push(`${mPrefix}: Título é obrigatório.`);
        if (!validAreas.includes(module.area)) errors.push(`${mPrefix}: Área inválida: ${module.area}`);
        if (!validTypes.includes(module.type)) errors.push(`${mPrefix}: Tipo inválido: ${module.type}`);
        if (!module.objective) errors.push(`${mPrefix}: Objetivo é obrigatório.`);
        if (!module.audience) errors.push(`${mPrefix}: audience é obrigatório.`);
        if (!module.estimatedTime) errors.push(`${mPrefix}: estimatedTime é obrigatório.`);
        if (typeof module.isRequired !== 'boolean') errors.push(`${mPrefix}: isRequired deve ser boolean.`);
        if (typeof module.requiresEvidence !== 'boolean') errors.push(`${mPrefix}: requiresEvidence deve ser boolean.`);
        if (!module.content) errors.push(`${mPrefix}: content é obrigatório.`);
        if (!Array.isArray(module.steps) || module.steps.length === 0) errors.push(`${mPrefix}: steps deve ser um array com itens.`);
        if (!module.practicalTask) errors.push(`${mPrefix}: practicalTask é obrigatório.`);
        if (!module.validationQuestion) errors.push(`${mPrefix}: validationQuestion é obrigatória.`);
        if (!module.expectedAnswer) errors.push(`${mPrefix}: expectedAnswer é obrigatória.`);

        if (module.requiresEvidence && !module.evidenceDescription) {
          errors.push(`${mPrefix}: requiresEvidence é true, mas evidenceDescription está vazio.`);
        }
      });
    }

    if (Array.isArray(phase.quiz)) {
      const qIds = new Set();
      phase.quiz.forEach(q => {
        const qPrefix = `Fase ${phase.id}, Questão [${q.id || 'sem id'}]`;
        if (!q.id) errors.push(`${qPrefix}: ID é obrigatório.`);
        if (q.id && qIds.has(q.id)) errors.push(`${qPrefix}: ID de questão duplicado na fase.`);
        if (q.id) qIds.add(q.id);

        if (!q.question) errors.push(`${qPrefix}: Pergunta é obrigatória.`);
        if (!q.correctAnswer) errors.push(`${qPrefix}: Resposta correta é obrigatória.`);

        if (q.options) {
          if (!Array.isArray(q.options)) errors.push(`${qPrefix}: options deve ser um array.`);
          if (q.options.length > 0 && !q.options.includes(q.correctAnswer)) {
            errors.push(`${qPrefix}: Resposta correta não está presente nas opções.`);
          }
        }
      });
    }
  });

  if (errors.length > 0) {
    console.error('\n❌ Problemas encontrados na estrutura da jornada:');
    errors.forEach(err => console.error(` - ${err}`));
    console.log(`\nTotal de inconsistências: ${errors.length}`);
    process.exit(1);
  } else {
    console.log('\n✅ Jornada validada com sucesso. Estrutura íntegra para produção.');
    process.exit(0);
  }
}

validate();