import React, { useState, useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useAuth } from '../context/AuthContext';

const Tutorial = () => {
    const { user } = useAuth();
    const [run, setRun] = useState(false);

    useEffect(() => {
        // Check if tutorial has been seen
        const hasSeenTutorial = localStorage.getItem(`hasSeenTutorial_${user?.role}`);

        if (!hasSeenTutorial && user) {
            // Delay slightly to ensure UI is rendered
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleJoyrideCallback = (data) => {
        const { status, type } = data;

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            // Save to local storage
            localStorage.setItem(`hasSeenTutorial_${user?.role}`, 'true');
            setRun(false);
        }
    };

    // Define steps based on role
    const ownerSteps = [
        {
            target: 'body',
            content: (
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Benvenuto in WORK360! 👋</h3>
                    <p>Facciamo un breve tour per mostrarti le funzionalità principali.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '.nav-item-owner',
            content: 'Qui puoi gestire tutti i tuoi cantieri attivi e archiviati.',
            placement: 'right',
        },
        {
            target: '.nav-item-owner-employees',
            content: 'Gestisci il tuo team, le anagrafiche e i ruoli.',
            placement: 'right',
        },
        {
            target: '.nav-item-owner-quotes',
            content: 'Crea preventivi professionali e genera i SAL con un click.',
            placement: 'right',
        },
        {
            target: '.nav-item-owner-settings',
            content: 'Configura i dati della tua azienda, logo e preferenze.',
            placement: 'right',
        },
    ];

    const workerSteps = [
        {
            target: 'body',
            content: (
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Benvenuto in WORK360! 👋</h3>
                    <p>Ecco come utilizzare l'app per il tuo lavoro quotidiano.</p>
                </div>
            ),
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: '.nav-item-worker-tab-attendance',
            content: 'Registra qui le tue entrate e uscite dal cantiere.',
            placement: 'right',
        },
        {
            target: '.nav-item-worker-tab-materials',
            content: 'Segna i materiali che hai utilizzato o prelevato.',
            placement: 'right',
        },
        {
            target: '.nav-item-worker-tab-daily-report',
            content: 'Compila il rapporto di fine giornata.',
            placement: 'right',
        },
    ];

    const steps = user?.role === 'owner' ? ownerSteps : workerSteps;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showSkipButton
            showProgress
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    primaryColor: '#0f172a', // Slate 900
                    zIndex: 10000,
                    arrowColor: '#fff',
                    backgroundColor: '#fff',
                    overlayColor: 'rgba(0, 0, 0, 0.6)', // Dark overlay
                    textColor: '#334155',
                    width: 400,
                },
                buttonNext: {
                    backgroundColor: '#0f172a',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    padding: '10px 20px',
                },
                buttonBack: {
                    color: '#64748b',
                    marginRight: 10,
                },
                buttonSkip: {
                    color: '#ef4444',
                    fontSize: '14px',
                },
            }}
            locale={{
                back: 'Indietro',
                close: 'Chiudi',
                last: 'Fine',
                next: 'Avanti',
                skip: 'Salta Tutorial',
            }}
        />
    );
};

export default Tutorial;
