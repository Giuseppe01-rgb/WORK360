import Layout from '../../components/Layout';

export default function TestPage() {
    return (
        <Layout title="Test Page">
            <div className="p-8">
                <h1 className="text-2xl font-bold text-slate-900 mb-4">Test Page</h1>
                <p className="text-slate-600">If you can see this, the basic layout works!</p>
                <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl">
                    <p className="text-green-800 font-medium">✅ React is rendering correctly</p>
                    <p className="text-green-800 font-medium">✅ Layout component is working</p>
                    <p className="text-green-800 font-medium">✅ Tailwind CSS is loaded</p>
                </div>
            </div>
        </Layout>
    );
}
