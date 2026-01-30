import MiniSearch, { SearchResult as MiniSearchResult } from 'minisearch';
import type { Epic, Feature, Milestone } from '@pmspec/types';
import { getEpics, getFeatures, getMilestones } from './dataService';
import { createLogger } from '../utils/logger';

const logger = createLogger('search');

/**
 * Searchable document type
 */
export type SearchableType = 'epic' | 'feature' | 'story' | 'milestone';

/**
 * Searchable document interface
 */
export interface Searchable {
  id: string;
  type: SearchableType;
  title: string;
  description?: string;
  content?: string;
  parentId?: string;
}

/**
 * Search options
 */
export interface SearchOptions {
  type?: SearchableType | SearchableType[];
  fuzzy?: number | boolean;
  prefix?: boolean;
  limit?: number;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  type: SearchableType;
  title: string;
  description?: string;
  score: number;
  matches: SearchMatch[];
  parentId?: string;
}

/**
 * Match information for highlighting
 */
export interface SearchMatch {
  field: string;
  term: string;
}

/**
 * Search Service for backend
 */
class SearchServiceClass {
  private miniSearch: MiniSearch<Searchable>;
  private documents: Map<string, Searchable> = new Map();
  private initialized = false;
  private indexing = false;

  constructor() {
    this.miniSearch = new MiniSearch<Searchable>({
      fields: ['title', 'description', 'content'],
      storeFields: ['id', 'type', 'title', 'description', 'parentId'],
      idField: 'id',
      // Support Chinese text
      tokenize: (text) => {
        return text.toLowerCase().split(/[\s\p{P}]+/u).filter(Boolean);
      },
      processTerm: (term) => term.toLowerCase(),
    });
  }

  /**
   * Initialize and index all documents
   */
  async index(): Promise<void> {
    if (this.indexing) {
      logger.warn('Index already in progress');
      return;
    }

    this.indexing = true;
    const startTime = Date.now();

    try {
      // Clear existing index
      this.miniSearch.removeAll();
      this.documents.clear();

      // Index epics
      const epics = await getEpics();
      for (const epic of epics) {
        this.addEpic(epic);
      }

      // Index features
      const features = await getFeatures();
      for (const feature of features) {
        this.addFeature(feature);
      }

      // Index milestones
      const milestones = await getMilestones();
      for (const milestone of milestones) {
        this.addMilestone(milestone);
      }

      this.initialized = true;
      const duration = Date.now() - startTime;
      logger.info({ 
        documentCount: this.documents.size, 
        duration 
      }, 'Search index built');
    } catch (error) {
      logger.error({ error }, 'Failed to build search index');
      throw error;
    } finally {
      this.indexing = false;
    }
  }

  /**
   * Add an epic to the index
   */
  addEpic(epic: Epic): void {
    if (!epic.id) return;
    
    const doc: Searchable = {
      id: epic.id,
      type: 'epic',
      title: epic.title,
      description: epic.description,
    };
    this.addDocument(doc);
  }

  /**
   * Add a feature to the index
   */
  addFeature(feature: Feature): void {
    if (!feature.id) return;

    const doc: Searchable = {
      id: feature.id,
      type: 'feature',
      title: feature.title,
      description: feature.description,
      parentId: feature.epic,
    };
    this.addDocument(doc);
  }

  /**
   * Add a milestone to the index
   */
  addMilestone(milestone: Milestone): void {
    if (!milestone.id) return;

    const doc: Searchable = {
      id: milestone.id,
      type: 'milestone',
      title: milestone.title,
      description: milestone.description,
    };
    this.addDocument(doc);
  }

  /**
   * Add document to index
   */
  addDocument(doc: Searchable): void {
    if (this.documents.has(doc.id)) {
      this.removeDocument(doc.id);
    }
    this.documents.set(doc.id, doc);
    this.miniSearch.add(doc);
  }

  /**
   * Remove document from index
   */
  removeDocument(id: string): void {
    const doc = this.documents.get(id);
    if (doc) {
      this.miniSearch.remove(doc);
      this.documents.delete(id);
    }
  }

  /**
   * Update document in index
   */
  updateDocument(doc: Searchable): void {
    this.addDocument(doc);
  }

  /**
   * Search for documents
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const {
      type,
      fuzzy = 0.2,
      prefix = true,
      limit = 20,
    } = options;

    const typeFilter = type
      ? Array.isArray(type) ? type : [type]
      : null;

    const searchOptions: any = {
      fuzzy,
      prefix,
      boost: {
        title: 2,
        description: 1,
        content: 0.5,
      },
    };

    if (typeFilter) {
      searchOptions.filter = (result: any) => typeFilter.includes(result.type);
    }

    const results = this.miniSearch.search(query, searchOptions);

    return results
      .slice(0, limit)
      .map((result: MiniSearchResult): SearchResult => ({
        id: result.id as string,
        type: result.type as SearchableType,
        title: result.title as string,
        description: result.description as string | undefined,
        score: result.score,
        parentId: result.parentId as string | undefined,
        matches: Object.entries(result.match).map(([term, fields]) => ({
          field: (fields as string[])[0] || 'title',
          term,
        })),
      }));
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Get status
   */
  getStatus(): { initialized: boolean; documentCount: number; indexing: boolean } {
    return {
      initialized: this.initialized,
      documentCount: this.documents.size,
      indexing: this.indexing,
    };
  }
}

// Export singleton instance
export const searchService = new SearchServiceClass();
