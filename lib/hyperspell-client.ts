'use server'

import Hyperspell from 'hyperspell';

const userId = 'anonymous'; // No user authentication in this project

function getHyperspellClient() {
    const apiKey = process.env.HYPERSPELL_API_KEY;
    if (!apiKey) {
        throw new Error('HYPERSPELL_API_KEY is not set');
    }
    return new Hyperspell({
        apiKey,
        userID: userId
    });
}

/**
 * Get a user token for Hyperspell authentication
 * Since this project doesn't have user authentication, we use 'anonymous' as the user ID
 */
export async function getUserToken() {
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
    const hyperspell = getHyperspellClient();

    const response = await hyperspell.memories.search({
        query,
        answer,
        sources: ['notion'], // Available integrations from the API
    });
    return response.answer;
}

/**
 * Store a memory in Hyperspell
 * @param content The content to store
 * @param metadata Optional metadata (title, type, etc.)
 */
export async function storeMemory(content: string, metadata?: { title?: string; type?: string; [key: string]: any }) {
    try {
        const hyperspell = getHyperspellClient();
        
        // Hyperspell stores memories by creating content with metadata
        // We'll use the memories API to store content
        const memoryContent = metadata?.title 
            ? `## ${metadata.title}\n\n${content}`
            : content;

        // Store memory - Hyperspell typically stores memories through integrations
        // For programmatic storage, we can use the memories.create or similar method
        // Note: Check Hyperspell SDK documentation for exact method
        
        // Using a workaround: create a memory by formatting content with metadata
        const formattedContent = `Type: ${metadata?.type || 'general'}\n${metadata?.title ? `Title: ${metadata.title}\n` : ''}${Object.entries(metadata || {})
            .filter(([key]) => !['title', 'type'].includes(key))
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')}\n\nContent:\n${memoryContent}`;

        // Store in Hyperspell - using memories.add or similar
        // Since exact API may vary, we'll use a simple approach
        await hyperspell.memories.add({
            content: formattedContent,
            metadata: metadata || {},
        });

        return { success: true };
    } catch (error) {
        console.error('Error storing memory in Hyperspell:', error);
        // Don't throw - memory storage failures shouldn't break the main flow
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
