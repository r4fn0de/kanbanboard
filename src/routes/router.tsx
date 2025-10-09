import { createHashRouter } from 'react-router-dom'
import MainWindow from '@/components/layout/MainWindow'
import { ProjectsOverview } from '@/components/projects/ProjectsOverview'
import { ProjectsFavorites } from '@/components/projects/ProjectsFavorites'
import { BoardsView } from '@/components/kanban/BoardsView'
import { HomeWelcome } from '@/components/home/HomeWelcome'
import { ProjectBoardView } from '@/components/projects/ProjectBoardView'
import { NotesView } from '@/components/notes/NotesView'

export const appRouter = createHashRouter([
  {
    path: '/',
    element: <MainWindow />,
    children: [
      {
        index: true,
        element: <HomeWelcome />,
      },
      {
        path: 'boards',
        element: <BoardsView />,
      },
      {
        path: 'projects/all',
        element: <ProjectsOverview />,
      },
      {
        path: 'projects/favorites',
        element: <ProjectsFavorites />,
      },
      {
        path: 'projects/:boardId',
        element: <ProjectBoardView />,
      },
      {
        path: 'projects/:boardId/notes',
        element: <NotesView />,
      },
    ],
  },
])
