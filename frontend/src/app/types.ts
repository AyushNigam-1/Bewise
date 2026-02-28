export interface Recommendation {
    insight_id: number;
    title: string;
    category: string;
    category_icon: string;
    description: string;
}

export type User = {
    user_id: number;
    name: string;
    email: string;
    favourite_books: number[]
    favourite_insights: number[]
};

export type Categories = {
    name: string,
    icon: string,
    description: string,
}
export type Book = {
    author: string,
    category: string,
    description: string,
    id: number,
    thumbnail: string,
    title: string
}