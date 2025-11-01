'use server'

import Hyperspell from 'hyperspell';

/**
 * Get a user token for Hyperspell authentication
 * Since this project doesn't have user authentication, we use 'anonymous' as the user ID
 */
export async function getUserToken() {
    const userId = 'anonymous'; // No user authentication in this project

    const hyperspell = new Hyperspell({ apiKey: process.env.HYPERSPELL_API_KEY });
    const response = await hyperspell.auth.userToken({ user_id: userId });
    return response.token;
}

/**
 * Search memories using Hyperspell
 * @param query The search query
 * @param answer Whether to return an answer (default: true)
 * @returns The answer from Hyperspell memories
 */
export async function search(query: string, answer: boolean = true) {
    const userId = 'anonymous'; // No user authentication in this project
    const hyperspell = new Hyperspell({
        apiKey: process.env.HYPERSPELL_API_KEY,
        userID: userId
    });

    const response = await hyperspell.memories.search({
        query,
        answer,
        sources: ['notion'], // Available integrations from the API
    });
    return response.answer;
}
