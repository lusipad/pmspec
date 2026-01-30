import MiniSearch, { SearchResult as MiniSearchResult } from 'minisearch';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { parseEpic, parseFeature, parseMilestone } from './parser.js';
import type { Epic, Feature, Milestone, UserStory } from './project.js';

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
  content?: string; // Additional searchable content (acceptance criteria, etc.)
  parentId?: string; // e.g., Feature's epic ID, Story's feature ID
}

/**
 * Search options
 */
export interface SearchOptions {
  type?: SearchableType | SearchableType[];
  fuzzy?: number | boolean;
  prefix?: boolean;
  limit?: number;
  boost?: Record<string, number>;
}

/**
 * Search result with match information
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
  positions?: number[];
}

/**
 * Default search options
 */
const DEFAULT_OPTIONS: SearchOptions = {
  fuzzy: 0.2,
  prefix: true,
  limit: 20,
  boost: {
    title: 2,
    description: 1,
    content: 0.5,
  },
};

/**
 * Search Service using MiniSearch
 */
export class SearchService {
  private miniSearch: MiniSearch<Searchable>;
  private documents: Map<string, Searchable> = new Map();
  private projectRoot: string;
  private initialized = false;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.miniSearch = new MiniSearch<Searchable>({
      fields: ['title', 'description', 'content'],
      storeFields: ['id', 'type', 'title', 'description', 'parentId'],
      idField: 'id',
      // Custom tokenizer for Chinese text support
      tokenize: (text) => {
        // Split on spaces, punctuation, and support Chinese character segmentation
        return text.toLowerCase().split(/[\s\p{P}]+/u).filter(Boolean);
      },
      // Process search terms similarly
      processTerm: (term) => term.toLowerCase(),
    });
  }

  /**
   * Initialize and index all documents from the project
   */
  async index(): Promise<void> {
    const pmspaceDir = path.join(this.projectRoot, 'pmspace');
    
    // Clear existing index
    this.miniSearch.removeAll();
    this.documents.clear();

    // Index epics
    await this.indexEpics(pmspaceDir);
    
    // Index features (and their user stories)
    await this.indexFeatures(pmspaceDir);
    
    // Index milestones
    await this.indexMilestones(pmspaceDir);

    this.initialized = true;
  }

  /**
   * Index all epic files
   */
  private async indexEpics(pmspaceDir: string): Promise<void> {
    try {
      const epicsDir = path.join(pmspaceDir, 'epics');
      const files = await readdir(epicsDir);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        try {
          const content = await readFile(path.join(epicsDir, file), 'utf-8');
          const epic = parseEpic(content);
          
          if (epic.id) {
            const doc: Searchable = {
              id: epic.id,
              type: 'epic',
              title: epic.title,
              description: epic.description,
            };
            this.addDocument(doc);
          }
        } catch (err) {
          // Skip invalid files
        }
      }
    } catch (err) {
      // Epics directory doesn't exist
    }
  }

  /**
   * Index all feature files and their user stories
   */
  private async indexFeatures(pmspaceDir: string): Promise<void> {
    try {
      const featuresDir = path.join(pmspaceDir, 'features');
      const files = await readdir(featuresDir);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        try {
          const content = await readFile(path.join(featuresDir, file), 'utf-8');
          const feature = parseFeature(content);
          
          if (feature.id) {
            // Build content from acceptance criteria
            const contentParts: string[] = [];
            if (feature.acceptanceCriteria) {
              contentParts.push(...feature.acceptanceCriteria);
            }
            
            const doc: Searchable = {
              id: feature.id,
              type: 'feature',
              title: feature.title,
              description: feature.description,
              content: contentParts.join(' '),
              parentId: feature.epicId,
            };
            this.addDocument(doc);
            
            // Index user stories
            if (feature.userStories) {
              for (const story of feature.userStories) {
                const storyDoc: Searchable = {
                  id: story.id,
                  type: 'story',
                  title: story.title,
                  description: story.description,
                  parentId: feature.id,
                };
                this.addDocument(storyDoc);
              }
            }
          }
        } catch (err) {
          // Skip invalid files
        }
      }
    } catch (err) {
      // Features directory doesn't exist
    }
  }

  /**
   * Index all milestone files
   */
  private async indexMilestones(pmspaceDir: string): Promise<void> {
    try {
      const milestonesDir = path.join(pmspaceDir, 'milestones');
      const files = await readdir(milestonesDir);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        try {
          const content = await readFile(path.join(milestonesDir, file), 'utf-8');
          const milestone = parseMilestone(content);
          
          if (milestone.id) {
            const doc: Searchable = {
              id: milestone.id,
              type: 'milestone',
              title: milestone.title,
              description: milestone.description,
            };
            this.addDocument(doc);
          }
        } catch (err) {
          // Skip invalid files
        }
      }
    } catch (err) {
      // Milestones directory doesn't exist
    }
  }

  /**
   * Add a document to the search index
   */
  addDocument(doc: Searchable): void {
    // Remove existing document if present
    if (this.documents.has(doc.id)) {
      this.removeDocument(doc.id);
    }
    
    this.documents.set(doc.id, doc);
    this.miniSearch.add(doc);
  }

  /**
   * Remove a document from the search index
   */
  removeDocument(id: string): void {
    const doc = this.documents.get(id);
    if (doc) {
      this.miniSearch.remove(doc);
      this.documents.delete(id);
    }
  }

  /**
   * Update a document in the search index
   */
  updateDocument(doc: Searchable): void {
    this.addDocument(doc); // addDocument handles removal if exists
  }

  /**
   * Search for documents matching the query
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // Build filter for type restriction
    const typeFilter = mergedOptions.type
      ? Array.isArray(mergedOptions.type)
        ? mergedOptions.type
        : [mergedOptions.type]
      : null;

    const searchOptions: any = {
      fuzzy: mergedOptions.fuzzy,
      prefix: mergedOptions.prefix,
      boost: mergedOptions.boost,
    };

    // Add filter if type is specified
    if (typeFilter) {
      searchOptions.filter = (result: any) => typeFilter.includes(result.type);
    }

    const results = this.miniSearch.search(query, searchOptions);

    return results
      .slice(0, mergedOptions.limit)
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
   * Get document by ID
   */
  getDocument(id: string): Searchable | undefined {
    return this.documents.get(id);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): Searchable[] {
    return Array.from(this.documents.values());
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clear all documents from the index
   */
  clear(): void {
    this.miniSearch.removeAll();
    this.documents.clear();
    this.initialized = false;
  }
}

/**
 * Highlight matching terms in text
 */
export function highlightMatches(
  text: string,
  matches: SearchMatch[],
  highlightStart = '\x1b[33m', // Yellow ANSI
  highlightEnd = '\x1b[0m'     // Reset ANSI
): string {
  if (!text || matches.length === 0) return text;

  const terms = matches.map((m) => m.term.toLowerCase());
  
  // Create regex pattern for all matching terms
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );

  return text.replace(pattern, `${highlightStart}$1${highlightEnd}`);
}

/**
 * Highlight matches with HTML tags (for web)
 */
export function highlightMatchesHtml(
  text: string,
  matches: SearchMatch[],
  className = 'search-highlight'
): string {
  return highlightMatches(
    text,
    matches,
    `<mark class="${className}">`,
    '</mark>'
  );
}

/**
 * Create a singleton search service instance
 */
let searchServiceInstance: SearchService | null = null;

export function getSearchService(projectRoot?: string): SearchService {
  if (!searchServiceInstance || (projectRoot && projectRoot !== searchServiceInstance['projectRoot'])) {
    searchServiceInstance = new SearchService(projectRoot);
  }
  return searchServiceInstance;
}

export default SearchService;
