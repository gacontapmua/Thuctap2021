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
    
    public partial class SongNgan_HiepDong_A3
    {
        public int A3_HiepDong_ID { get; set; }
        public Nullable<int> TraLoiCanh { get; set; }
        public Nullable<int> TraLoiCanh_Dut { get; set; }
        public Nullable<int> DienS { get; set; }
        public Nullable<int> DienR { get; set; }
        public string GhiChu { get; set; }
        public Nullable<int> BaoCaoID { get; set; }
    
        public virtual BaoCaoNgay BaoCaoNgay { get; set; }
    }
}