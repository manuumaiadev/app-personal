export function calcularStatusFicha(dataVencimento) {
  const hoje = new Date();
  const vencimento = dataVencimento.toDate();
  const diffMs = vencimento - hoje;
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return 'vencida';
  if (diffDias <= 7) return 'a_vencer';
  return 'ativa';
}

export function calcularProgresso(criadoEm, dataVencimento) {
  const inicio = criadoEm?.toDate ? criadoEm.toDate() : new Date(criadoEm);
  const fim = dataVencimento.toDate();
  const hoje = new Date();
  const total = fim - inicio;
  const passado = hoje - inicio;
  const pct = Math.min(100, Math.max(0, Math.round((passado / total) * 100)));
  const diasRestantes = Math.max(0, Math.ceil((fim - hoje) / 86400000));
  return { pct, diasRestantes };
}

export const CORES_STATUS = {
  ativa: '#22c55e',
  a_vencer: '#f59e0b',
  vencida: '#ef4444',
};

export const LABELS_STATUS = {
  ativa: 'Ativa',
  a_vencer: 'A vencer',
  vencida: 'Vencida',
};
