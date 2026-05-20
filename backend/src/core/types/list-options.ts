/**
 * Opções de paginação para listagens. Estrutura preparada para uso futuro
 * nos repositórios — mantém compatibilidade com o STYLE_GUIDE mesmo
 * enquanto nenhum endpoint pagina de fato.
 */
export interface ListOptions {
    page?: number;
    pageSize?: number;
}
