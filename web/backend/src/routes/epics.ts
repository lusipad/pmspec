import { Router, Request, Response } from 'express';
import { getEpics, getEpicById } from '../services/dataService';

export const epicRoutes = Router();

// GET /api/epics - List all epics
epicRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const epics = await getEpics();
    res.json(epics);
  } catch (error) {
    console.error('Error fetching epics:', error);
    res.status(500).json({ error: 'Failed to fetch epics' });
  }
});

// GET /api/epics/:id - Get specific epic
epicRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const epic = await getEpicById(id);

    if (!epic) {
      return res.status(404).json({ error: `Epic ${id} not found` });
    }

    res.json(epic);
  } catch (error) {
    console.error('Error fetching epic:', error);
    res.status(500).json({ error: 'Failed to fetch epic' });
  }
});
