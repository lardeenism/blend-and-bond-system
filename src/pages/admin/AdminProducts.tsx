import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit3, Search, Upload } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getProductImage } from '../../utils/imageMap';
import { formatCurrency } from '../../utils/helpers';

let cachedProducts: any[] = [];
let cachedCategories: any[] = [];

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>(cachedProducts);
  const [categories, setCategories] = useState<any[]>(cachedCategories);
  const [loading, setLoading] = useState(cachedProducts.length === 0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', base_price: '', category_id: '', image_filename: '', stock: '10',
    has_sizes: false, is_available: true, is_featured: false, is_best_seller: false,
    sizes: [
      { size_label: 'Small', volume_ml: 250, price: '' },
      { size_label: 'Medium', volume_ml: 350, price: '' },
      { size_label: 'Large', volume_ml: 500, price: '' },
    ]
  });

  useEffect(() => {
    fetchProducts();
    axios.get('/api/categories').then(r => {
      cachedCategories = r.data.categories;
      setCategories(r.data.categories);
    }).catch(() => {});
  }, []);

  const fetchProducts = () => {
    if (cachedProducts.length === 0) setLoading(true);
    axios.get('/api/products/all')
      .then(r => {
        cachedProducts = r.data.products;
        setProducts(r.data.products);
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  const resetForm = () => setForm({
    name: '', description: '', base_price: '', category_id: '', image_filename: '', stock: '10',
    has_sizes: false, is_available: true, is_featured: false, is_best_seller: false,
    sizes: [
      { size_label: 'Small', volume_ml: 250, price: '' },
      { size_label: 'Medium', volume_ml: 350, price: '' },
      { size_label: 'Large', volume_ml: 500, price: '' },
    ]
  });

  const handleEdit = (p: any) => {
    setEditing(p);
    setImageFile(null);
    setForm({
      name: p.name, description: p.description || '', base_price: String(p.base_price),
      category_id: String(p.category_id), image_filename: p.image_filename || '', stock: String(p.stock ?? 10),
      has_sizes: p.has_sizes, is_available: p.is_available, is_featured: p.is_featured,
      is_best_seller: p.is_best_seller,
      sizes: p.sizes?.length ? p.sizes.map((s: any) => ({
        size_label: s.size_label, volume_ml: s.volume_ml || '', price: String(s.price)
      })) : [
        { size_label: 'Small', volume_ml: 250, price: '' },
        { size_label: 'Medium', volume_ml: 350, price: '' },
        { size_label: 'Large', volume_ml: 500, price: '' },
      ]
    });
    setImagePreview(getProductImage(p.image_filename));
  };

  const handleNew = () => { setEditing({}); setImageFile(null); setImagePreview(''); resetForm(); };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setForm(prev => ({ ...prev, image_filename: file.name }));
    } else {
      setImagePreview(form.image_filename ? getProductImage(form.image_filename) : '');
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleSave = async () => {
    if (!form.name || !form.base_price || !form.category_id) {
      toast.error('Name, price, and category are required'); return;
    }
    try {
      const payload = new FormData();
      payload.append('name', form.name);
      payload.append('description', form.description);
      payload.append('base_price', String(parseFloat(form.base_price)));
      payload.append('category_id', String(parseInt(form.category_id)));
      payload.append('stock', String(parseInt(form.stock) || 0));
      payload.append('image_filename', form.image_filename);
      payload.append('has_sizes', String(form.has_sizes));
      payload.append('is_available', String(form.is_available));
      payload.append('is_featured', String(form.is_featured));
      payload.append('is_best_seller', String(form.is_best_seller));
      payload.append('sizes', JSON.stringify(
        form.has_sizes ? form.sizes.filter(s => s.price).map(s => ({
          size_label: s.size_label, volume_ml: s.volume_ml || null, price: parseFloat(String(s.price))
        })) : []
      ));
      if (imageFile) payload.append('image', imageFile);

      if (editing?.id) {
        await axios.put(`/api/products/${editing.id}`, payload);
        toast.success('Product updated');
      } else {
        await axios.post('/api/products', payload);
        toast.success('Product created');
      }
      setEditing(null);
      setImageFile(null);
      setImagePreview('');
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };



  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category_name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category_id === parseInt(categoryFilter);
    return matchSearch && matchCategory;
  });

  if (loading) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Products</h2>
          <p className="page-subtitle">{products.length} total products</p>
        </div>
        <button onClick={handleNew} className="btn btn-primary"><Plus size={16} /> Add Product</button>
      </div>

      {/* Product Form Modal */}
      {editing !== null && createPortal(
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{editing.id ? 'Edit Product' : 'New Product'}</h3>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group"><label className="form-label">Product Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Cappuccino" /></div>
                <div className="form-group"><label className="form-label">Base Price (₱) *</label>
                  <input type="number" className="form-input" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label>
                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Category *</label>
                  <select className="form-select" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div className="form-group"><label className="form-label">Stock *</label>
                  <input type="number" min="0" className="form-input" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="e.g., 10" /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  onChange={e => handleImageChange(e.target.files?.[0] || null)}
                />
                <div className="image-upload-row">
                  <div className="image-upload-preview">
                    {imagePreview ? <img src={imagePreview} alt="Preview" /> : <span>No image selected</span>}
                  </div>
                  <div className="image-upload-copy">
                    <p className="upload-help">Upload a photo for the product. If you do not choose a new file while editing, the existing image stays in place.</p>
                    <div className="upload-meta"><Upload size={14} /> {imageFile ? imageFile.name : form.image_filename || 'No file chosen'}</div>
                  </div>
                </div>
              </div>
              <div className="form-checks">
                <label className="check-label"><input type="checkbox" checked={form.is_available} onChange={e => setForm({...form, is_available: e.target.checked})} /> Available</label>
                <label className="check-label"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} /> Featured</label>
                <label className="check-label"><input type="checkbox" checked={form.is_best_seller} onChange={e => setForm({...form, is_best_seller: e.target.checked})} /> Best Seller</label>
                <label className="check-label"><input type="checkbox" checked={form.has_sizes} onChange={e => setForm({...form, has_sizes: e.target.checked})} /> Has Sizes (Drinks)</label>
              </div>
              {form.has_sizes && (
                <div className="sizes-section">
                  <h4 className="sizes-title">Size Pricing</h4>
                  <div className="sizes-grid">
                    {form.sizes.map((s, i) => (
                      <div key={s.size_label} className="size-row">
                        <span className="size-label">{s.size_label}</span>
                        <div className="size-fields">
                          <div className="form-group"><label className="form-label-sm">Volume (ml)</label>
                            <input type="number" className="form-input form-input-sm" value={s.volume_ml}
                              onChange={e => { const arr = [...form.sizes]; arr[i] = {...s, volume_ml: parseInt(e.target.value) || 0}; setForm({...form, sizes: arr}); }} /></div>
                          <div className="form-group"><label className="form-label-sm">Price (₱)</label>
                            <input type="number" className="form-input form-input-sm" value={s.price}
                              onChange={e => { const arr = [...form.sizes]; arr[i] = {...s, price: e.target.value}; setForm({...form, sizes: arr}); }} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditing(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn btn-primary">Save Product</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Search and Filters */}
      <div className="filters-bar" style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, margin: 0, minWidth: '200px' }}>
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
        </div>
        <select 
          className="form-select" 
          style={{ width: 'auto', minWidth: '150px', margin: 0 }} 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr>
            <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Sizes</th><th>Rating</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td><div className="product-cell">
                  <img src={getProductImage(p.image_filename)} alt="" className="table-img" />
                  <div><strong>{p.name}</strong>
                    <span className="cell-sub">{p.description?.slice(0, 40)}...</span></div>
                </div></td>
                <td>{p.category_name}</td>
                <td>{formatCurrency(p.base_price)}</td>
                <td>
                  <span className={`stock-badge ${Number(p.stock) <= 0 ? 'out' : ''}`}>
                    {Number(p.stock) > 0 ? `${p.stock} in stock` : 'Out of stock'}
                  </span>
                </td>
                <td>{p.has_sizes ? (
                  <div className="size-badges">
                    {p.sizes?.map((s: any) => <span key={s.size_label} className="size-badge">{s.size_label[0]} {s.volume_ml ? `${s.volume_ml}ml` : ''} {formatCurrency(s.price)}</span>)}
                  </div>
                ) : <span className="text-muted">—</span>}</td>
                <td><span className="rating-cell"><Star size={12} /> {p.avg_rating > 0 ? parseFloat(p.avg_rating).toFixed(1) : '—'}</span></td>
                <td><span className={`status-badge ${p.is_available ? 'status-completed' : 'status-cancelled'}`}>{p.is_available ? 'Active' : 'Inactive'}</span></td>
                <td><div className="action-btns">
                  <button onClick={() => handleEdit(p)} className="icon-btn edit"><Edit3 size={14} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Star({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
}
