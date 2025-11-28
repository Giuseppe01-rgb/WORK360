// Materials Management Functions (add these after existing handler functions)

const loadTodayMaterials = async () => {
    setLoadingMaterials(true);
    try {
        const response = await materialUsageAPI.getTodayUsage(selectedSite);
        setTodayMaterials(response.data);
    } catch (error) {
        console.error('Load today materials error:', error);
        showError('Errore nel caricamento dei materiali');
    } finally {
        setLoadingMaterials(false);
    }
};

const handleMaterialSelect = (material) => {
    setSelectedMaterial(material);
    setShowMaterialSearch(false);
    setShowMaterialUsageForm(true);
};

const handleMaterialUsageConfirm = async (usageData) => {
    try {
        await materialUsageAPI.recordUsage(usageData);
        showSuccess('Materiale registrato con successo!');
        setShowMaterialUsageForm(false);
        setSelectedMaterial(null);
        loadTodayMaterials();
    } catch (error) {
        console.error('Record usage error:', error);
        showError('Errore nella registrazione del materiale');
        throw error;
    }
};

const handleReportMaterial = async (reportData) => {
    try {
        await reportedMaterialAPI.report(reportData);
        showSuccess('Segnalazione inviata! L\'ufficio la approverà a breve.');
        setShowReportForm(false);
        loadTodayMaterials(); // Reload to show pending material
    } catch (error) {
        console.error('Report material error:', error);
        showError('Errore nell\'invio della segnalazione');
        throw error;
    }
};

const resetMaterialFlow = () => {
    setShowMaterialSearch(false);
    setShowMaterialUsageForm(false);
    setShowReportForm(false);
    setSelectedMaterial(null);
};

// Load today's materials when tab becomes active
useEffect(() => {
    if (activeTab === 'materials' && selectedSite) {
        loadTodayMaterials();
    }
}, [activeTab, selectedSite]);
