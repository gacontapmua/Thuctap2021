//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated from a template.
//
//     Manual changes to this file may cause unexpected behavior in your application.
//     Manual changes to this file will be overwritten if the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace TTQK7
{
    using System;
    using System.Collections.Generic;
    
    public partial class QuanBuu_CongVan_B4
    {
        public int B4_CongVan_ID { get; set; }
        public Nullable<int> Ve { get; set; }
        public Nullable<int> Di { get; set; }
        public Nullable<int> Dong { get; set; }
        public string GhiChu { get; set; }
        public Nullable<int> BaoCaoID { get; set; }
    
        public virtual BaoCaoNgay BaoCaoNgay { get; set; }
    }
}