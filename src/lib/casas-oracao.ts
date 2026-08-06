export interface CasaOracaoGrupo {
  cidade: string;
  casas: string[];
}

export const CASAS_ORACAO: CasaOracaoGrupo[] = [
  {
    cidade: "Amparo",
    casas: [
      "Amparo - Centro",
      "Distrito Arcadas",
      "Fazenda Campineiro",
      "Jardim Brasil",
      "Jardim das Aves",
      "Jardim São Dimas",
      "Vale Verde",
    ],
  },
  {
    cidade: "Monte Alegre do Sul",
    casas: ["Jardim Vitória", "Mostardas", "Ponte Alta", "Três Pontes"],
  },
];